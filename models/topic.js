var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var topicSchema = new Schema({
  date: {
    type: Date,
    default: new Date().toJSON().slice(0,10)
  },
  topic: String,
  sources: [],
  authors: [],
  expires: {
    type: Date,
    default: new Date(Date.now() + 24*60*60*1000)   // 24 hours
  }
});

module.exports = mongoose.model('Topic', topicSchema);
