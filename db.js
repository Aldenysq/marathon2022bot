require('dotenv').config()
const { MongoClient } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGO_LOGIN_PASSWORD}@marathon.in3fu.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
const db = client.db("marathon");


async function addTraining(username, training) {
  const collection = db.collection(username);
  await collection.insertOne(training);
}

async function getNumTrainings(username) {
  const collection = db.collection(username);
  let num = await collection.count({});
  return num;
}

async function getLastTrainings(username, limit) {
  const collection = db.collection(username);
  let trainings = await collection.find({}).toArray();
  return trainings.slice(trainings.length - limit);
}

async function getLastDistances(username, limit) {
  const collection = db.collection(username);
  let trainings = await collection.find({}).toArray();
  trainings = trainings.slice(trainings.length - limit);
  let distance = 0;
  for (train of trainings) {
    distance += parseFloat(train.distance);
  }
  return distance;
}

async function getLastTime(username, limit) {
  const collection = db.collection(username);
  let trainings = await collection.find({}).toArray();
  trainings = trainings.slice(trainings.length - limit);
  let timeSec = 0;
  for (train of trainings) {
    timeSec += train.timeSec;
  }
  return timeSec;
}

async function getMarathonUsernames() {
  return await db.listCollections().toArray();
}

async function insertFileIdToLastTraining(username, training, file_id) {
  const collection = db.collection(username);
  await collection.updateOne(training, 
    { '$set': { 'file_id': file_id } }
    );
}


async function main() {
  await client.connect();
}
main();

module.exports = {
  addTraining, 
  getNumTrainings,
  getLastTrainings,
  getLastDistances,
  getLastTime,
  getMarathonUsernames,
  insertFileIdToLastTraining
};