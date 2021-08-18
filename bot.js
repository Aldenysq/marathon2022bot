require('dotenv').config()
const TeleBot = require('telebot');
const configures = {
  token: process.env.TELEGRAM_TOKEN
};
const bot = new TeleBot(configures);
const db = require('./db');
let waitingTrainingScreen = {};

async function addTraining(msg) {
  if (msg.chat.type != 'supergroup') {
    return;
  }
  if (!(await allowedToAddTraining(msg))) {
    msg.reply.text("Ты добавлял тренировку за последние 4 часа, по-моему ты хочешь меня обмануть");
    return;
  }
  let username = msg.from.username;
  let text = msg.text.split(' ');
  let distance = text[1];
  let runTime = text[2];
  const minSecArray = runTime.split(':');
  if (isNaN(distance) || minSecArray.length != 2 || isNaN(minSecArray[0]) || isNaN(minSecArray[1])) {
    msg.reply.text("Неправильный формат");
    return;
  }
  let comment = text.slice(3).join(' ');
  let date = msg.date;
  distance = parseFloat(distance);
  const timeSec = parseFloat(minSecArray[0]) * 60 + parseFloat(minSecArray[1]);
  let training = makeTraining(distance, timeSec, comment, date);
  db.addTraining(username, training);
  await msg.reply.text("нормально ебашишь, " + username + "!");
  await msg.reply.text("теперь скинь скрин тренировки");
  waitingTrainingScreen[username] = true;
}
async function allowedToAddTraining(msg){
  let numOfTrains = await db.getNumTrainings(msg.from.username);
  if (numOfTrains == 0) {
    return true;
  }
  let lastTrain = await db.getLastTrainings(msg.from.username, 1);
  lastTrain = lastTrain[0];
  let secSinceLastTraining = msg.date - lastTrain.date;
  let hoursSinceLastTraining = secSinceLastTraining / 3600;
  return (hoursSinceLastTraining >= 4);

}
function makeTraining(distance, timeSec, comment, date) {
  return {
    'distance' : distance,
    'timeSec' : timeSec, 
    'comment' : comment,
    'date' : date,
    'file_id' : 'null'
  }
}
bot.on('/ебашу', addTraining);

async function numOfTrainings(msg) {
  let username = msg.from.username;
  let num = await db.getNumTrainings(username);
  msg.reply.text("У тебя уже " + num + " тренировок(ик) @" + username);
}
bot.on('/тренировок', numOfTrainings);

async function trains(msg) {
  let username = msg.from.username;
  text = msg.text.split(' ');
  let limit = 1000000;
  if (text.length > 1) {
      if (isNaN(text[1])) {
      msg.reply.text("Кол-во должно быть числом");
      return;
    }
    limit = parseInt(text[1]);
  }
  let num = parseInt(await db.getNumTrainings(username));
  limit = Math.min(limit, num);
  let response = await db.getLastTrainings(username, limit);
  let textResponse = "твои последние " + limit + " тренировки(ок): \n";
  for (train of response) {
    let runSecTime = train.timeSec;
    textResponse += "distance in km: " + train.distance + "\ntime [min:sec]: " + Math.floor(runSecTime/60) + ":" + runSecTime%60  + "\ncomment: " + train.comment + "\ndate: " + new Date(parseInt(train.date) * 1000) + "\n\n";
  }
  msg.reply.text(textResponse);
}
bot.on('/тренировки', trains);

async function totalKm(msg) {
  let username = msg.from.username;
  text = msg.text.split(' ');
  let limit = 1000000;
  if (text.length > 1) {
    if (isNaN(text[1])) {
      msg.reply.text("Кол-во должно быть числом");
      return;
    }
    limit = parseInt(text[1]);
  }
  let num = parseInt(await db.getNumTrainings(username));
  limit = Math.min(limit, num);
  let distance = await db.getLastDistances(username, limit);
  msg.reply.text("За последние " + limit + " тренировок(ки) ты пробежал " + distance + " км");
}
bot.on('/дистанция', totalKm);

async function totalTime(msg) {  
  let username = msg.from.username;
  text = msg.text.split(' ');
  let limit = 1000000;
  if (text.length > 1) {
    if (isNaN(text[1])) {
      msg.reply.text("Кол-во должно быть числом");
      return;
    }
    limit = parseInt(text[1]);
  }
  let num = parseInt(await db.getNumTrainings(username));
  limit = Math.min(limit, num);
  let timeSec = await db.getLastTime(username, limit);
  let hours = Math.floor(timeSec/3600);
  let minutes = Math.floor((timeSec - hours * 3600)/60);
  msg.reply.text("За последние " + limit + " тренировок(ки) ты пробежал " + hours + " часов(а) и " + minutes + " минут(ы)");
}
bot.on('/время', totalTime);

async function totalSpeed(msg) {
  let username = msg.from.username;
  text = msg.text.split(' ');
  let limit = 1000000;
  if (text.length > 1) {
    if (isNaN(text[1])) {
      msg.reply.text("Кол-во должно быть числом");
      return;
    }
    limit = parseInt(text[1]);
  }
  let num = parseInt(await db.getNumTrainings(username));
  limit = Math.min(limit, num);
  let timeSec = await db.getLastTime(username, limit);
  let time = timeSec/60;
  let distance = await db.getLastDistances(username, limit);
  if (distance == 0) {
    distance = 1;
  }
  let minPerKm = time/distance;
  let min = Math.floor(minPerKm);
  let sec = Math.ceil((minPerKm - min) * 60);
  msg.reply.text("За последние " + limit + " тренировок(ки) твой средний темп был " + min + " минут(ы) и " + sec + " секунд на км");
}
bot.on('/темп', totalSpeed);

async function leaderboard(msg) {
  let collections = await db.getMarathonUsernames();
  let results = [];
  for (marathoner of collections) {
    let username = marathoner.name;
    const numTrainings = await db.getNumTrainings(username);
    let userDist = await db.getLastDistances(username, numTrainings);
    let userTime = await db.getLastTime(username, numTrainings);
    userTime /= 60;
    results.push([userDist, userTime, username]);
  }
  results = results.sort(function(a, b) {return b[0] - a[0];});
  const awards = ["🥇", "🥈", "🥉"];
  let responseText = "";
  let awardIndex = 0;
  for (marathoner of results) {
    const hours = Math.floor(marathoner[1]/60);
    const mins = Math.floor(marathoner[1] - hours * 60);
    responseText += awards[awardIndex] + " " + marathoner[2] + " пробежал " + marathoner[0] + " км за " + hours + " ч и " + mins + " мин\n";
    awardIndex += 1;
    awardIndex %= 3;
  }
  msg.reply.text(responseText);

}
bot.on('/рейтинг', leaderboard);


async function photoReceived(msg) {
  const username = msg.from.username;
  // ignore if training image is not expected
  if (waitingTrainingScreen[username] != true) {
    return;
  }
  const file_id = msg.photo[msg.photo.length - 1].file_id;  // get best photo resolution file id
  let lastTraining = await db.getLastTrainings(username, 1);
  lastTraining = lastTraining[0];
  await db.insertFileIdToLastTraining(username, lastTraining, file_id);
  waitingTrainingScreen[username] = false;
  return msg.reply.text('тренировку записал, молодец!')
  

}
bot.on('photo', photoReceived);

async function getLastPhotoTraining(msg) {
  const username = msg.from.username;
  let lastTraining = await db.getLastTrainings(username, 1);
  lastTraining = lastTraining[0];
  msg.reply.photo(lastTraining.file_id);

}
bot.on('/lastimg', getLastPhotoTraining);


async function help(msg) {
  let responseText = "Я marathonBot и был создан гениальным программистом который скрывает свое имя для конфиденциальности.\n";
  responseText += "Я умею: \n";
  responseText += "/ебашу <дистанция в км> <мин:сек> {комментарий>} *- добавить тренировку; параметр <комментарий> необязательный*\n";
  responseText += "/тренировок *- узнать количество твоих тренировок*\n";
  responseText += "/тренировки {<кол-во>} *- отчет твоих последних <кол-во> тренировок; параметр <кол-во> необязательный, по умолчанию все твои тренировки*\n";
  responseText += "/дистанция {<кол-во>} *- твоя дистанция в км за последние <кол-во> тренировок; параметр <кол-во> необязательный, по умолчанию все твои тренировки*\n";
  responseText += "/время {<кол-во>} *- твое общее время бега за последние <кол-во> тренировок; параметр <кол-во> необязательный, по умолчанию все твои тренировки*\n";
  responseText += "/темп {<кол-во>} *- твой темп за последние <кол-во> тренировок; параметр <кол-во> необязательный, по умолчанию все твои тренировки*\n";
  responseText += "/lastimg *- получить фото последней тренировки*\n";
  responseText += "/рейтинг *- текущий рейтинг бегунов в группе*\n";
  responseText += "/help *- список моих команд*\n";
  msg.reply.text(responseText, {parseMode: 'Markdown' });

}
bot.on('/help', help);

bot.start();

