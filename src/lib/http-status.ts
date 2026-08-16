export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];

export const HttpStatusMessages = {
  [HttpStatus.OK]: 'OK',
  [HttpStatus.CREATED]: 'Created',
  [HttpStatus.ACCEPTED]: 'Accepted',
  [HttpStatus.NO_CONTENT]: 'No Content',
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
} as const;