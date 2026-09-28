exports.successMessage = (data, message) => (
    {
        status: true,
        message: message || 'Success',
        data: data
    }
);

exports.errorMessage = (data, message) => (
    {
        status: false,
        message: message || 'Error',
        data: data
    }
);

exports.statusCode = {
    success: 200,
    error: 500,
    notfound: 404,
    unauthorized: 401,
    conflict: 409,
    created: 201,
    bad: 400,
    nocontent: 204,
    forbidden: 403,
};