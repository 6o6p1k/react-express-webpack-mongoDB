var HttpError = require('./error').HttpError;

module.exports = function(req, res, next) {
    console.log('checkAuth');
    if (!req.session.user) {
        return next(new HttpError(401, "Invalid username/password, or you are not authorized"));
    }

    next();
};