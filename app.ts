import express, { NextFunction, Request, Response } from 'express';
import * as joi from 'joi';
import { compareSync, genSaltSync, hashSync } from 'bcryptjs';

const app = express();
app.use(express.json());
export default app;

interface UserDto {
  username: string;
  email: string;
  type: 'user' | 'admin';
  password: string;
}

interface UserEntry {
  email: string;
  type: 'user' | 'admin';
  salt: string;
  passwordhash: string;
}

// Database mock where the username is the primary key of a user.
const MEMORY_DB: Record<string, UserEntry> = {};

// CODE HERE
//
// I want to be able to register a new unique user (username and password). After the user is created I
// should be able to login with my username and password. If a user register request is invalid a 400 error
// should be returned, if the user is already registered a conflict error should be returned.
// On login the users credentials should be verified.
// Because we don't have a database in this environment we store the users in memory. Fill the helper functions
// to query the memory db.

function getUserByUsername(name: string): UserEntry | undefined {
  return MEMORY_DB[name];
}

function getUserByEmail(email: string): UserEntry | undefined {
  return Object.values(MEMORY_DB).find((u) => u.email === email);
}

// Request body -> UserDto
app.post(
  '/register',
  // Validate user object using joi
  // - username (required, min 3, max 24 characters)
  // - email (required, valid email address)
  // - type (required, select dropdown with either 'user' or 'admin')
  // - password (required, min 5, max 24 characters, upper and lower case, at least one special character)
  validateRegistration(),
  (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password, type } = req.body as UserDto;
    if (getUserByUsername(username)) {
      return next(new UsernameAlreadyExists(username));
    }
    if (getUserByEmail(email)) {
      return next(new EmailAlreadyExists(email));
    }

    const salt = genSaltSync();
    const passwordhash = hashSync(password, salt);
    MEMORY_DB[username] = { email, salt, type, passwordhash };

    res.status(201).json({ username, email, type });
  }
);

// Request body -> { username: string, password: string }
app.post('/login', validateLogin(), (req: Request, res: Response, next) => {
  // Return 200 if username and password match
  // Return 401 else
  const { username, password } = req.body;
  const user = getUserByUsername(username);
  if (!user || !compareSync(password, user.passwordhash)) {
    return next(new InvalidCredentials());
  }
  res.status(200).json({});
});
app.use(errorHandler());

function validateRegistration() {
  let schema = joi.object({
    username: joi.string().min(3).max(24).required(),
    email: joi.string().email().required(),
    type: joi.valid('user', 'admin').required(),
    password: joi
      .string()
      .required()
      .min(5)
      .max(24)
      .custom((value, helper) => {
        let upper = /[A-Z]/.test(value);
        let lower = /[a-z]/.test(value);
        let special = !/^[a-zA-Z0-9]*$/.test(value);
        if (!upper) {
          return helper.message({
            custom: 'password must have an upper case character',
          });
        }
        if (!lower) {
          return helper.message({
            custom: 'password must have a lower case character',
          });
        }
        if (!special) {
          return helper.message({
            custom: 'password must have a special case character',
          });
        }
        return value;
      }),
  });
  return validateReqBody(schema);
}

function validateLogin() {
  let schema = joi.object({
    username: joi.string().required(),
    password: joi.string().required(),
  });
  return validateReqBody(schema);
}

function validateReqBody(objectSchema: joi.ObjectSchema) {
  return (req, res, next) => {
    try {
      joi.attempt(req.body, objectSchema);
      next();
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  };
}

class UsernameAlreadyExists extends Error {
  status = 409;
  name = UsernameAlreadyExists.name;
  constructor(username: string) {
    super(`A user with the username ${username} already exists.`);
    Object.setPrototypeOf(this, UsernameAlreadyExists.prototype);
  }
}

class EmailAlreadyExists extends Error {
  status = 409;
  name = EmailAlreadyExists.name;
  constructor(email: string) {
    super(`A user with the email ${email} already exists.`);
    Object.setPrototypeOf(this, EmailAlreadyExists.prototype);
  }
}

class InvalidCredentials extends Error {
  status = 401;
  name = InvalidCredentials.name;
  constructor() {
    super(`Invalid username/password.`);
    Object.setPrototypeOf(this, InvalidCredentials.prototype);
  }
}

function errorHandler() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (
      err instanceof UsernameAlreadyExists ||
      err instanceof EmailAlreadyExists ||
      err instanceof InvalidCredentials
    ) {
      res
        .status(err.status)
        .json({ error_name: err.name, error_message: err.message });
      return;
    }
    next(err);
  };
}
