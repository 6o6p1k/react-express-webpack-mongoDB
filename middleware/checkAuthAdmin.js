var HttpError = require('./error').HttpError;
var config = require('../config');

module.exports = function(req, res, next) {
    console.log("checkAuthAdmin: ", req.session);
    if (req.session.user != config.get('AdministratorId')) {
        return next(new HttpError(401, "you are not authorized like Administrator"));
    }

    next();
};