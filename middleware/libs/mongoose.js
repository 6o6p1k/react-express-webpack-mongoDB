
var mongoose = require('mongoose');
var config = require('../../config');
//console.log('mongooseClientConOpt: ',config.get('mongoose:options'),' ,url: ',config.get('mongoose:url'));
mongoose.connect(config.get('mongoose:url'), config.get('mongoose:options'));
//mongoose.set('useCreateIndex', true);

module.exports = mongoose;