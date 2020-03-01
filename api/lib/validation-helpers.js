const _ = require('lodash');
const validator = require('validator');
const escapeStringRegexp = require('escape-string-regexp');

const moment = require('moment-timezone');

const { ApiError } = require('./better-ctx-throw');

validator.extend('min', (str, min) => validator.toFloat(str) >= min);
validator.extend('max', (str, max) => validator.toFloat(str) <= max);

validator.extend('gt', (val, compare) => val > compare);
validator.extend('gte', (val, compare) => val >= compare);
validator.extend('lt', (val, compare) => val < compare);
validator.extend('lte', (val, compare) => val <= compare);

validator.extend('doesNotEqual', (val, compare) => val !== compare);
validator.extend('isDivisibleByFloat', (str, div) => {
  const num = validator.toFloat(str);
  return num / div === parseInt(num / div);
});

validator.extend('isEnum', (value, possibleVals) => _.includes(possibleVals, value));

validator.extend('toDateStrict', (value) => {
  const m = moment(value);
  if (m.isValid()) return m.toDate();
  return new Error(`Invalid date: "${value}"`);
});
validator.extend('checkValidDate', (value) => moment(value).isValid());

validator.extend('notSet', (value, enabled) => (enabled ? value === undefined : true));

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
validator.extend('isSlug', (value) => !!value.match(SLUG_REGEX));

// lat/lng
validator.extend('isLnglat', (value) => {
  // Turn "a,b" into an array instead of a string
  if (typeof value === 'string') value = value.split(',');

  if (!_.isArray(value)) return false;

  return validator.isLongitude(value[0]) && validator.isLatitude(value[1]);
});
validator.extend('isLatitude', (value) => validator.isFloat(value) && value >= -90 && value <= 90);
validator.extend('isLongitude', (value) => validator.isFloat(value) && value >= -180 && value <= 180);

const DATE_REGEX = {
  yyyymmdd: /^(19|20)[0-9][0-9]-([0][0-9]|1[0-2])-([0-2][0-9]|3[01])$/,
  hhmm: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
};
validator.extend('isYYYYMMDD', (value) => !!value.match(DATE_REGEX.yyyymmdd));
validator.extend('isHHMM', (value) => !!value.match(DATE_REGEX.hhmm));

validator.extend('escapeForRegex', (value) => escapeStringRegexp(value));

validator.extend('toLowerCase', (value) => value.toLowerCase());

validator.extend('toUpperCase', (value) => value.toUpperCase());

validator.extend('toCleanPhone', (value) => {
  if (value === undefined) return undefined;
  if (!value) return '';
  // value = value.replace(/[^0-9+]/g, '');
  value = value.replace(/[^0-9]/g, '');
  // assume the numbers as US/CAN if 10 digits long
  // if (value.indexOf('+') === -1) {
  //   if (value.length === 10) value = `1${value}`;
  //   value = `+${value}`;
  // }
  return value;
  // var number = phone(value, '');
  // if (number.length === 0 || !number[0]) return null;
  // return number[0];
});

validator.extend('toCleanPostalCode', (value) => {
  if (value === undefined) return undefined;
  if (!value) return '';
  // remove spaces in postal codes
  return value.replace(' ', '').toUpperCase();
});


const POSTAL_CODE_REGEX = {
  // allow for 5-digit zip codes and zip+4 codes
  US: /(^\d{5}$)|(^\d{5}-\d{4}$)/,
  // canadian postal codes are weird
  CA: /^(?!.*[DFIOQU])[A-VXY][0-9][A-Z][0-9][A-Z][0-9]$/i,
};
validator.extend('isPostalCode', (value, countryCode) => {
  const postalCodeRegex = POSTAL_CODE_REGEX[countryCode];
  if (!postalCodeRegex) {
    return new ApiError('BadRequest', 'We do not yet support `postalCode`s from this country.');
  }
  if (postalCodeRegex.test(value)) return true;
  return new ApiError('BadRequest', `This is not an acceptable ${countryCode} postal code.`);
});

validator.extend('isStrongPassword', (password) => {
  // these rules come from Dwolla, not by our own choice :\
  if (password.length < 8) return false;
  return true;
  // const hasDigit = password.match(/[0-9]/) ? 1 : 0;
  // const hasUppercase = password.match(/[A-Z]/) ? 1 : 0;
  // const hasLowercase = password.match(/[a-z]/) ? 1 : 0;
  // const hasSpecialChar = password.match(/[^0-9A-Za-z]/) ? 1 : 0;
  // return (hasDigit + hasUppercase + hasLowercase + hasSpecialChar) >= 3;
});

const sanitizers = [
  'toString', // (input) - convert the input to a string.
  'toDate', // (input) - convert the input to a date, or null if the input is not a date.
  'toDateStrict', // (input) - convert the input to a date, or throw an error if not a date
  'toFloat', // (input) - convert the input to a float, or NaN if the input is not a float.
  'toInt', // (input [, radix]) - convert the input to an integer, or NaN if the input is not an integer.
  'toBoolean', // (input [, strict]) - convert the input to a boolean. Everything except for '0', 'false' and '' returns true. In strict mode 'only' '1' and 'true' return true.
  'toArray', // make sure the value is an array
  'splitToArray', // make sure the value is an array and accept csv
  'trim', // (input [, chars]) - trim characters (whitespace by default) from both sides of the input.
  'ltrim', // (input [, chars]) - trim characters from the left-side of the input.
  'rtrim', // (input [, chars]) - trim characters from the right-side of the input.
  'escape', // (input) - replace <, >, & and " with HTML entities.
  'stripLow', // (input [, keep_new_lines]) - remove characters with a numerical value < 32 and 127, mostly control characters. If 'keep_new_lines' is true, newline characters are preserved (\n and \r, hex 0xA and 0xD). Unicode-safe in JavaScript.
  'whitelist', // (input, chars) - remove characters that do not appear in the whitelist.
  'blacklist', // (input, chars) - remove characters that appear in the blacklist.

  'escapeForRegex',
  'toLowerCase',
  'toUpperCase',
  'toCleanPhone',
  'toCleanPostalCode',
  'toCleanArrayOfEmails',
  'toValidEmbeddingRule',
];

const multipleArgValidator = ['isLength'];
const toggleWithTrueValidator = ['notSet'];
const sanitizersWithoutArgs = ['trim', 'rtrim', 'ltrim', 'toInt'];

// validator doesn't like passing arrays or complex objects.
// It converts them to strings before passing them
// so here we can define validators/sanitizers that can accept complex JS objects
const complexValidators = {
  required(value) {
    if (value === null || value === undefined || value === '') {
      return new Error('Missing parameter `#KEY`');
    }
    return true;
  },
  toArray(value) {
    if (_.isArray(value)) return value;
    if (!value) return [];
    return [value];
  },
  isArray(value) {
    return _.isArray(value);
  },
  hasNoDuplicatesBy(value, compare) {
    const compareArray = _.map(value, compare);
    return _.uniq(compareArray).length === compareArray.length;
  },
  // returns an array and supports splitting by a character
  // defaults to ',' as split char
  splitToArray(value, split) {
    if (_.isArray(value)) return value;
    if (!value) return [];
    return value.split(split === true ? ',' : split);
  },
  isEnumArray: function isEnumArray(valArray, possibleVals) {
    if (!valArray || valArray.length === 0) return true;
    if (valArray.length === _.intersection(valArray, possibleVals).length) {
      return true;
    }
    const badVals = _.difference(valArray, possibleVals);
    return new Error(`Bad values: ${badVals.join(', ')}`);
  },
  // ALL keys must be present
  hasAllKeys(obj, possibleKeys) {
    const keys = _.keys(obj);
    return possibleKeys.length === keys.length && _.xor(possibleKeys, keys).length === 0;
  },
  // ALL keys that are present must be from the list
  hasValidKeys(obj, possibleKeys) {
    const keys = _.keys(obj);
    return _.difference(keys, possibleKeys).length === 0;
  },
  // ALL keys that are present must be from the list
  hasValidValues(obj, possibleVals) {
    const values = _.values(obj);
    return _.difference(values, possibleVals).length === 0;
  },
  noMissingValues(obj, message) {
    const emptyProps = [];
    _.deepMapValues(obj, (val, path) => {
      if (val === null || val === undefined || val === '') emptyProps.push(path);
    });
    if (emptyProps.length > 0) return new Error(`Missing props -- ${emptyProps.join(', ')}`);
    return true;
  },
  toCleanArrayOfEmails(emails) {
    // This function takes as input an array
    // It returns an array of cleaned and valid emails (trim, lowercase and non empty emails)
    // If an email is invalid an error will also be thrown
    if (!emails) return [];
    let cleanEmails = _.map(emails, (e) => e.trim().toLowerCase());
    cleanEmails = _.compact(cleanEmails);
    const validEmails = _.filter(cleanEmails, (e) => validator.isEmail(e));
    if (cleanEmails.length !== validEmails.length) {
      return new Error('The email "#{email}" is not valid.');
    }
    return validEmails;
  },
  isAddress(value) {
    return module.exports.validate(value, {
      line1: { },
      line2: { },
      city: { },
      postalCode: { },
      state: { },
      country: { isCountryCode: true },
    }, { strict: true });
  },

};


module.exports = {
  validator,
  complexValidators,

  /*
  Validates `object` and throws a BadRequest exception if a field is invalid.
  `validations` should be an object mapping fields to validators.
  `options` may contain the following values:
    `label`: context to give in thrown exception
    `strict`: do not allow values in `object` that aren't in `validations`
    `discardExtraProps`:
      allow values in `object` that aren't in `validations`, but delete them from `object`

  Validators available are those from the validator package,as well as `complexValidators`.
  The validator package documentation is here:
    https://github.com/chriso/validator.js
  Here's a quick listing of what it can do:
    extend init
    toString toDate toFloat toInt toBoolean
    equals contains matches
    isEmail isURL isIP isFQDN isBoolean isAlpha isAlphanumeric isNumeric isDecimal isHexadecimal
    isHexColor isLowercase isUppercase isInt isFloat isDivisibleBy isNull isLength isByteLength
    isUUID isDate isAfter isBefore isIn isCreditCard isISIN isISBN isMobilePhone isCurrency isJSON
    isMultibyte isAscii isFullWidth isHalfWidth isVariableWidth isSurrogatePair isBase64 isMongoId
    ltrim rtrim trim
    escape stripLow
    whitelist blacklist
    normalizeEmail
  */
  validate(object, validations, options = {}) {
    function badRequest(err) {
      const message = err instanceof Error ? err.message : err;
      const errorType = options.errorType || 'BadRequest';
      if (options.label) {
        throw new ApiError(errorType, `Validation error in ${options.label}:  ${message}`);
      } else {
        throw new ApiError(errorType, `Validation error: ${message}`);
      }
    }

    const keysWithValidations = _.keys(_.pick(object, _.keys(validations)));
    const keysWithoutValidations = _.without(_.keys(object), ...keysWithValidations);

    // do not allow any extra keys without a validation
    if (options.strict) {
      if (keysWithoutValidations.length > 0) {
        badRequest(`Params not allowed - ${keysWithoutValidations.join(', ')}`);
      }
    // allow extra keys but discard these values
    } else if (options.discardExtraProps) {
      const keepKeys = keysWithValidations;
      _.each(_.keys(object), (k) => {
        if (!keepKeys.includes(k)) delete object[k];
      });
    }

    _.forEach(validations, (keyValidations, key) => {
      if ([null, undefined, ''].includes(object[key])) {
        if (keyValidations.required) {
          badRequest(`Missing required parameter \`${key}\``);
        } else if (keyValidations.default !== undefined) {
          object[key] = keyValidations.default;
        } else {
          // TODO: remove this and make the API more strict?
          // rewrites empty strings into nulls
          if (object[key] === '') object[key] = null; // eslint-disable-line no-lonely-if
        }
      } else {
        _.forEach(keyValidations, (args, validationName) => {
          if (validationName === 'default') return;
          // some validators accept multiple args
          if (!_.includes(multipleArgValidator, validationName)) args = [args];

          // put the value to validate as the first arg
          args.unshift(object[key]);

          const validation = complexValidators[validationName] || validator[validationName];
          // Sanitizers will change object values
          if (_.includes(sanitizers, validationName)) {
          // fix default args by removing the extra "true" argument
            if (_.includes(sanitizersWithoutArgs, validationName) && args[1] === true) args.pop();

            const sanitizedVal = validation(...args);
            if (sanitizedVal instanceof Error) badRequest(sanitizedVal);
            else object[key] = sanitizedVal;

          // Validators just check some conditions and may throw an error
          } else {
            // dont usually want to pass through "true" as options
            // unless the validator uses it to toggle on/off
            if (!toggleWithTrueValidator.includes(validationName) && args[1] === true) args.pop();
            const validResult = validation(...args);
            if (validResult === false) {
              args.shift();
              badRequest(`Invalid parameter \`${key}\` -- failed validation = ${validationName}(${args.join(',')})`);
            } else if (validResult instanceof Error) {
              badRequest(validResult);
            }
          }
        });
      }
    });
  },
};
