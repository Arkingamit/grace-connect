const { MongoClient } = require('mongodb');
const uri = 'mongodb+srv://Graceapp:Graceapp%40123@grace.kbypufu.mongodb.net/grace-connect?retryWrites=true&w=majority&appName=GRACE';
const client = new MongoClient(uri);
async function run() {
  try {
    await client.connect();
    const db = client.db('grace-connect');
    const coll = db.collection('pushsubscriptions');
    const iosCount = await coll.countDocuments({ platform: 'ios' });
    const allCount = await coll.countDocuments();
    console.log('Total subscriptions:', allCount);
    console.log('iOS subscriptions:', iosCount);
    const latestIos = await coll.find({ platform: 'ios' }).sort({ _id: -1 }).limit(1).toArray();
    if (latestIos.length > 0) {
       console.log('Latest iOS user ID:', latestIos[0].userId);
       console.log('Latest iOS fcmToken starts with:', latestIos[0].fcmToken.substring(0, 15) + '...');
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
