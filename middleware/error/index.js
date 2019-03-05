var path = require('path');
var util = require('util');
var http = require('http');

function HttpError(status, message) {
    console.log("module error done status: ",status,", message: ",message);
    Error.apply(this, arguments);
    Error.captureStackTrace(this, HttpError);
    this.status = status;
    this.message = message || http.STATUS_CODES[status] || "Error";
}

util.inherits(HttpError, Error);
HttpError.prototype.name = 'HttpError';
exports.HttpError = HttpError;

function AuthError(message) {
    Error.apply(this, arguments);
    Error.captureStackTrace(this, AuthError);
    this.message = message;
}
util.inherits(AuthError, Error);
AuthError.prototype.name = 'AuthError';
exports.AuthError = AuthError;

function DevError(message) {
    Error.apply(this, arguments);
    Error.captureStackTrace(this, DevError);
    this.message = message;
}
util.inherits(DevError, Error);
DevError.prototype.name = 'AuthError';
exports.DevError = DevError;