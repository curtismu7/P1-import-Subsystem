(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : {
    "default": e
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;
},{}],2:[function(require,module,exports){
module.exports = require('./lib/axios');
},{"./lib/axios":4}],3:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var settle = require('./../core/settle');
var cookies = require('./../helpers/cookies');
var buildURL = require('./../helpers/buildURL');
var buildFullPath = require('../core/buildFullPath');
var parseHeaders = require('./../helpers/parseHeaders');
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
var transitionalDefaults = require('../defaults/transitional');
var AxiosError = require('../core/AxiosError');
var CanceledError = require('../cancel/CanceledError');
var parseProtocol = require('../helpers/parseProtocol');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;
    function done() {
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    if (utils.isFormData(requestData) && utils.isStandardBrowserEnv()) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);

    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request
      request = null;
    }

    if ('onloadend' in request) {
      // Use onloadend if available
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || transitionalDefaults;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(new AxiosError(
        timeoutErrorMessage,
        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
        config,
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (!request) {
          return;
        }
        reject(!cancel || (cancel && cancel.type) ? new CanceledError() : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    var protocol = parseProtocol(fullPath);

    if (protocol && [ 'http', 'https', 'file' ].indexOf(protocol) === -1) {
      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
      return;
    }


    // Send the request
    request.send(requestData);
  });
};

},{"../cancel/CanceledError":6,"../core/AxiosError":9,"../core/buildFullPath":11,"../defaults/transitional":17,"../helpers/parseProtocol":29,"./../core/settle":14,"./../helpers/buildURL":20,"./../helpers/cookies":22,"./../helpers/isURLSameOrigin":25,"./../helpers/parseHeaders":28,"./../utils":33}],4:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.CanceledError = require('./cancel/CanceledError');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');
axios.VERSION = require('./env/data').version;
axios.toFormData = require('./helpers/toFormData');

// Expose AxiosError class
axios.AxiosError = require('../lib/core/AxiosError');

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

// Expose isAxiosError
axios.isAxiosError = require('./helpers/isAxiosError');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;

},{"../lib/core/AxiosError":9,"./cancel/CancelToken":5,"./cancel/CanceledError":6,"./cancel/isCancel":7,"./core/Axios":8,"./core/mergeConfig":13,"./defaults":16,"./env/data":18,"./helpers/bind":19,"./helpers/isAxiosError":24,"./helpers/spread":30,"./helpers/toFormData":31,"./utils":33}],5:[function(require,module,exports){
'use strict';

var CanceledError = require('./CanceledError');

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;

  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;

  // eslint-disable-next-line func-names
  this.promise.then(function(cancel) {
    if (!token._listeners) return;

    var i;
    var l = token._listeners.length;

    for (i = 0; i < l; i++) {
      token._listeners[i](cancel);
    }
    token._listeners = null;
  });

  // eslint-disable-next-line func-names
  this.promise.then = function(onfulfilled) {
    var _resolve;
    // eslint-disable-next-line func-names
    var promise = new Promise(function(resolve) {
      token.subscribe(resolve);
      _resolve = resolve;
    }).then(onfulfilled);

    promise.cancel = function reject() {
      token.unsubscribe(_resolve);
    };

    return promise;
  };

  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new CanceledError(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Subscribe to the cancel signal
 */

CancelToken.prototype.subscribe = function subscribe(listener) {
  if (this.reason) {
    listener(this.reason);
    return;
  }

  if (this._listeners) {
    this._listeners.push(listener);
  } else {
    this._listeners = [listener];
  }
};

/**
 * Unsubscribe from the cancel signal
 */

CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
  if (!this._listeners) {
    return;
  }
  var index = this._listeners.indexOf(listener);
  if (index !== -1) {
    this._listeners.splice(index, 1);
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

module.exports = CancelToken;

},{"./CanceledError":6}],6:[function(require,module,exports){
'use strict';

var AxiosError = require('../core/AxiosError');
var utils = require('../utils');

/**
 * A `CanceledError` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function CanceledError(message) {
  // eslint-disable-next-line no-eq-null,eqeqeq
  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED);
  this.name = 'CanceledError';
}

utils.inherits(CanceledError, AxiosError, {
  __CANCEL__: true
});

module.exports = CanceledError;

},{"../core/AxiosError":9,"../utils":33}],7:[function(require,module,exports){
'use strict';

module.exports = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

},{}],8:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');
var buildFullPath = require('./buildFullPath');
var validator = require('../helpers/validator');

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(configOrUrl, config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  var fullPath = buildFullPath(config.baseURL, config.url);
  return buildURL(fullPath, config.params, config.paramsSerializer);
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method: method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url: url,
        data: data
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});

module.exports = Axios;

},{"../helpers/buildURL":20,"../helpers/validator":32,"./../utils":33,"./InterceptorManager":10,"./buildFullPath":11,"./dispatchRequest":12,"./mergeConfig":13}],9:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [config] The config.
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
function AxiosError(message, code, config, request, response) {
  Error.call(this);
  this.message = message;
  this.name = 'AxiosError';
  code && (this.code = code);
  config && (this.config = config);
  request && (this.request = request);
  response && (this.response = response);
}

utils.inherits(AxiosError, Error, {
  toJSON: function toJSON() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code,
      status: this.response && this.response.status ? this.response.status : null
    };
  }
});

var prototype = AxiosError.prototype;
var descriptors = {};

[
  'ERR_BAD_OPTION_VALUE',
  'ERR_BAD_OPTION',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ERR_NETWORK',
  'ERR_FR_TOO_MANY_REDIRECTS',
  'ERR_DEPRECATED',
  'ERR_BAD_RESPONSE',
  'ERR_BAD_REQUEST',
  'ERR_CANCELED'
// eslint-disable-next-line func-names
].forEach(function(code) {
  descriptors[code] = {value: code};
});

Object.defineProperties(AxiosError, descriptors);
Object.defineProperty(prototype, 'isAxiosError', {value: true});

// eslint-disable-next-line func-names
AxiosError.from = function(error, code, config, request, response, customProps) {
  var axiosError = Object.create(prototype);

  utils.toFlatObject(error, axiosError, function filter(obj) {
    return obj !== Error.prototype;
  });

  AxiosError.call(axiosError, error.message, code, config, request, response);

  axiosError.name = error.name;

  customProps && Object.assign(axiosError, customProps);

  return axiosError;
};

module.exports = AxiosError;

},{"../utils":33}],10:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

module.exports = InterceptorManager;

},{"./../utils":33}],11:[function(require,module,exports){
'use strict';

var isAbsoluteURL = require('../helpers/isAbsoluteURL');
var combineURLs = require('../helpers/combineURLs');

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
module.exports = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

},{"../helpers/combineURLs":21,"../helpers/isAbsoluteURL":23}],12:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var transformData = require('./transformData');
var isCancel = require('../cancel/isCancel');
var defaults = require('../defaults');
var CanceledError = require('../cancel/CanceledError');

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

},{"../cancel/CanceledError":6,"../cancel/isCancel":7,"../defaults":16,"./../utils":33,"./transformData":15}],13:[function(require,module,exports){
'use strict';

var utils = require('../utils');

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
module.exports = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
      return utils.merge(target, source);
    } else if (utils.isPlainObject(source)) {
      return utils.merge({}, source);
    } else if (utils.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'beforeRedirect': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};

},{"../utils":33}],14:[function(require,module,exports){
'use strict';

var AxiosError = require('./AxiosError');

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
module.exports = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!response.status || !validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(new AxiosError(
      'Request failed with status code ' + response.status,
      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
      response.config,
      response.request,
      response
    ));
  }
};

},{"./AxiosError":9}],15:[function(require,module,exports){
'use strict';

var utils = require('./../utils');
var defaults = require('../defaults');

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
module.exports = function transformData(data, headers, fns) {
  var context = this || defaults;
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

},{"../defaults":16,"./../utils":33}],16:[function(require,module,exports){
(function (process){(function (){
'use strict';

var utils = require('../utils');
var normalizeHeaderName = require('../helpers/normalizeHeaderName');
var AxiosError = require('../core/AxiosError');
var transitionalDefaults = require('./transitional');
var toFormData = require('../helpers/toFormData');

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('../adapters/xhr');
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('../adapters/http');
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults = {

  transitional: transitionalDefaults,

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }

    var isObjectPayload = utils.isObject(data);
    var contentType = headers && headers['Content-Type'];

    var isFileList;

    if ((isFileList = utils.isFileList(data)) || (isObjectPayload && contentType === 'multipart/form-data')) {
      var _FormData = this.env && this.env.FormData;
      return toFormData(isFileList ? {'files[]': data} : data, _FormData && new _FormData());
    } else if (isObjectPayload || contentType === 'application/json') {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: require('./env/FormData')
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

module.exports = defaults;

}).call(this)}).call(this,require('_process'))
},{"../adapters/http":3,"../adapters/xhr":3,"../core/AxiosError":9,"../helpers/normalizeHeaderName":26,"../helpers/toFormData":31,"../utils":33,"./env/FormData":27,"./transitional":17,"_process":37}],17:[function(require,module,exports){
'use strict';

module.exports = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

},{}],18:[function(require,module,exports){
module.exports = {
  "version": "0.27.2"
};
},{}],19:[function(require,module,exports){
'use strict';

module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

},{}],20:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
module.exports = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

},{"./../utils":33}],21:[function(require,module,exports){
'use strict';

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
module.exports = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

},{}],22:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

},{"./../utils":33}],23:[function(require,module,exports){
'use strict';

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
module.exports = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};

},{}],24:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

/**
 * Determines whether the payload is an error thrown by Axios
 *
 * @param {*} payload The value to test
 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
 */
module.exports = function isAxiosError(payload) {
  return utils.isObject(payload) && (payload.isAxiosError === true);
};

},{"./../utils":33}],25:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

module.exports = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

},{"./../utils":33}],26:[function(require,module,exports){
'use strict';

var utils = require('../utils');

module.exports = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

},{"../utils":33}],27:[function(require,module,exports){
// eslint-disable-next-line strict
module.exports = null;

},{}],28:[function(require,module,exports){
'use strict';

var utils = require('./../utils');

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
module.exports = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

},{"./../utils":33}],29:[function(require,module,exports){
'use strict';

module.exports = function parseProtocol(url) {
  var match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
  return match && match[1] || '';
};

},{}],30:[function(require,module,exports){
'use strict';

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
module.exports = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

},{}],31:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

var utils = require('../utils');

/**
 * Convert a data object to FormData
 * @param {Object} obj
 * @param {?Object} [formData]
 * @returns {Object}
 **/

function toFormData(obj, formData) {
  // eslint-disable-next-line no-param-reassign
  formData = formData || new FormData();

  var stack = [];

  function convertValue(value) {
    if (value === null) return '';

    if (utils.isDate(value)) {
      return value.toISOString();
    }

    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
      return typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
    }

    return value;
  }

  function build(data, parentKey) {
    if (utils.isPlainObject(data) || utils.isArray(data)) {
      if (stack.indexOf(data) !== -1) {
        throw Error('Circular reference detected in ' + parentKey);
      }

      stack.push(data);

      utils.forEach(data, function each(value, key) {
        if (utils.isUndefined(value)) return;
        var fullKey = parentKey ? parentKey + '.' + key : key;
        var arr;

        if (value && !parentKey && typeof value === 'object') {
          if (utils.endsWith(key, '{}')) {
            // eslint-disable-next-line no-param-reassign
            value = JSON.stringify(value);
          } else if (utils.endsWith(key, '[]') && (arr = utils.toArray(value))) {
            // eslint-disable-next-line func-names
            arr.forEach(function(el) {
              !utils.isUndefined(el) && formData.append(fullKey, convertValue(el));
            });
            return;
          }
        }

        build(value, fullKey);
      });

      stack.pop();
    } else {
      formData.append(parentKey, convertValue(data));
    }
  }

  build(obj);

  return formData;
}

module.exports = toFormData;

}).call(this)}).call(this,require("buffer").Buffer)
},{"../utils":33,"buffer":35}],32:[function(require,module,exports){
'use strict';

var VERSION = require('../env/data').version;
var AxiosError = require('../core/AxiosError');

var validators = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new AxiosError(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

module.exports = {
  assertOptions: assertOptions,
  validators: validators
};

},{"../core/AxiosError":9,"../env/data":18}],33:[function(require,module,exports){
'use strict';

var bind = require('./helpers/bind');

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

// eslint-disable-next-line func-names
var kindOf = (function(cache) {
  // eslint-disable-next-line func-names
  return function(thing) {
    var str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  };
})(Object.create(null));

function kindOfTest(type) {
  type = type.toLowerCase();
  return function isKindOf(thing) {
    return kindOf(thing) === type;
  };
}

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return Array.isArray(val);
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
var isArrayBuffer = kindOfTest('ArrayBuffer');


/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (kindOf(val) !== 'object') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
var isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
var isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
var isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
var isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} thing The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(thing) {
  var pattern = '[object FormData]';
  return thing && (
    (typeof FormData === 'function' && thing instanceof FormData) ||
    toString.call(thing) === pattern ||
    (isFunction(thing.toString) && thing.toString() === pattern)
  );
}

/**
 * Determine if a value is a URLSearchParams object
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
var isURLSearchParams = kindOfTest('URLSearchParams');

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 */

function inherits(constructor, superConstructor, props, descriptors) {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  props && Object.assign(constructor.prototype, props);
}

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function} [filter]
 * @returns {Object}
 */

function toFlatObject(sourceObj, destObj, filter) {
  var props;
  var i;
  var prop;
  var merged = {};

  destObj = destObj || {};

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if (!merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = Object.getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
}

/*
 * determines whether a string ends with the characters of a specified string
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 * @returns {boolean}
 */
function endsWith(str, searchString, position) {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  var lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}


/**
 * Returns new array from array like object
 * @param {*} [thing]
 * @returns {Array}
 */
function toArray(thing) {
  if (!thing) return null;
  var i = thing.length;
  if (isUndefined(i)) return null;
  var arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
}

// eslint-disable-next-line func-names
var isTypedArray = (function(TypedArray) {
  // eslint-disable-next-line func-names
  return function(thing) {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && Object.getPrototypeOf(Uint8Array));

module.exports = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM,
  inherits: inherits,
  toFlatObject: toFlatObject,
  kindOf: kindOf,
  kindOfTest: kindOfTest,
  endsWith: endsWith,
  toArray: toArray,
  isTypedArray: isTypedArray,
  isFileList: isFileList
};

},{"./helpers/bind":19}],34:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],35:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":34,"buffer":35,"ieee754":36}],36:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],37:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],38:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createCircularProgress = createCircularProgress;
/**
 * Circular Progress Spinner Component
 * Usage: createCircularProgress({ value, label, state, id })
 * - value: 0-100 (percent)
 * - label: status message (optional)
 * - state: '', 'error', 'warning', 'complete', 'ready' (optional)
 * - id: DOM id (optional)
 * 
 * Fixes visual duplication and rendering bugs in progress spinner during async operations
 */
function createCircularProgress() {
  let {
    value = 0,
    label = '',
    state = '',
    id = ''
  } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  // Ensure proper sizing and rendering calculations
  const size = 80;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp value between 0 and 100
  const percent = Math.max(0, Math.min(100, value));

  // Calculate stroke dash array for proper circular progress
  const dashOffset = circumference - percent / 100 * circumference;

  // Generate unique ID if not provided
  const elementId = id || `circular-progress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Create wrapper element with proper state management
  const wrapper = document.createElement('div');
  wrapper.className = `circular-progress${state ? ' ' + state : ''}`;
  wrapper.id = elementId;
  wrapper.setAttribute('role', 'progressbar');
  wrapper.setAttribute('aria-valuenow', percent);
  wrapper.setAttribute('aria-valuemin', 0);
  wrapper.setAttribute('aria-valuemax', 100);
  wrapper.setAttribute('aria-label', label ? `${label} ${percent}%` : `${percent}%`);

  // Add data attributes for debugging and state tracking
  wrapper.setAttribute('data-percent', percent);
  wrapper.setAttribute('data-state', state);
  wrapper.setAttribute('data-created', new Date().toISOString());

  // Create SVG with proper viewBox and dimensions
  wrapper.innerHTML = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background circle -->
      <circle 
        class="circular-bg" 
        cx="${size / 2}" 
        cy="${size / 2}" 
        r="${radius}" 
        fill="none"
        stroke="#e0e0e0"
        stroke-width="${stroke}"
      />
      <!-- Foreground progress circle -->
      <circle 
        class="circular-fg" 
        cx="${size / 2}" 
        cy="${size / 2}" 
        r="${radius}" 
        fill="none"
        stroke="var(--brand-color, #7c3aed)"
        stroke-width="${stroke}"
        stroke-linecap="round"
        stroke-dasharray="${circumference}"
        stroke-dashoffset="${dashOffset}"
        transform="rotate(-90 ${size / 2} ${size / 2})"
      />
    </svg>
    <!-- Percentage label -->
    <span class="circular-label">${Math.round(percent)}%</span>
    ${label ? `<span class="circular-status">${label}</span>` : ''}
  `;

  // Add debug logging for spinner creation
  console.debug('Circular Progress Created:', {
    id: elementId,
    percent,
    state,
    size,
    stroke,
    radius,
    circumference,
    dashOffset,
    label
  });
  return wrapper;
}

},{}],39:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ElementRegistry = void 0;
// ElementRegistry: Centralized DOM element lookup utility
// Provides safe, memoized access to all required UI elements with logging for missing elements
// Usage: import { ElementRegistry } from './element-registry.js';

const elementCache = {};
function getElement(selector, description) {
  let required = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
  // Input validation
  if (!selector || typeof selector !== 'string') {
    console.error(`[ElementRegistry] Invalid selector provided: ${selector}`);
    return null;
  }

  // Security: Prevent potential XSS through selector injection
  // Allow valid attribute selectors with quotes but prevent script injection
  if (selector.includes('<') || selector.includes('>') || selector.includes('"') && !selector.includes('[') && !selector.includes(']') || selector.includes("'") && !selector.includes('[') && !selector.includes(']')) {
    console.error(`[ElementRegistry] Potentially unsafe selector detected: ${selector}`);
    return null;
  }

  // Check cache first
  if (elementCache[selector]) {
    return elementCache[selector];
  }
  try {
    const el = document.querySelector(selector);
    if (!el && required) {
      console.warn(`[ElementRegistry] Missing required element: ${description} (${selector})`);
    } else if (!el) {
      console.info(`[ElementRegistry] Optional element not found: ${description} (${selector})`);
    } else {
      // Validate element is still in DOM
      if (!document.contains(el)) {
        console.warn(`[ElementRegistry] Element found but not in DOM: ${description} (${selector})`);
        elementCache[selector] = null;
        return null;
      }
    }
    elementCache[selector] = el;
    return el;
  } catch (error) {
    console.error(`[ElementRegistry] Error finding element: ${description} (${selector})`, error);
    elementCache[selector] = null;
    return null;
  }
}
const ElementRegistry = exports.ElementRegistry = {
  // Main UI elements
  importButton: () => getElement('#import-btn', 'Import Button'),
  fileInput: () => getElement('#csv-file', 'File Input'),
  dashboardTab: () => getElement('#dashboard-tab', 'Dashboard Tab'),
  dragDropArea: () => getElement('#drag-drop-area', 'Drag-and-Drop Area', false),
  // Notification and progress containers
  notificationContainer: () => getElement('#notification-area', 'Notification Container'),
  progressContainer: () => {
    // Try specific progress containers first, then fallback to generic
    return getElement('#import-progress-container', 'Import Progress Container', false) || getElement('#delete-progress-container', 'Delete Progress Container', false) || getElement('#modify-progress-container', 'Modify Progress Container', false) || getElement('#export-progress-container', 'Export Progress Container', false) || getElement('#progress-container', 'Progress Container', false) || getElement('.progress-container', 'Progress Container (class)', false);
  },
  // Token and connection status elements
  tokenStatus: () => getElement('#token-status-indicator', 'Token Status'),
  connectionStatus: () => getElement('#connection-status', 'Connection Status'),
  currentTokenStatus: () => getElement('#current-token-status', 'Current Token Status'),
  homeTokenStatus: () => getElement('#home-token-status', 'Home Token Status'),
  // File handling elements
  fileInfo: () => getElement('#file-info', 'File Info'),
  previewContainer: () => getElement('#dashboard-preview', 'Preview Container'),
  fileInputLabel: () => getElement('label[for="csv-file"]', 'File Input Label'),
  deleteFileInput: () => getElement('#delete-csv-file', 'Delete File Input'),
  deleteFileInputLabel: () => getElement('label[for="delete-csv-file"]', 'Delete File Input Label'),
  modifyFileInput: () => getElement('#modify-csv-file', 'Modify File Input'),
  modifyFileInputLabel: () => getElement('label[for="modify-csv-file"]', 'Modify File Input Label'),
  // Population selection elements
  importPopulationSelect: () => getElement('#import-population-select', 'Import Population Select'),
  deletePopulationSelect: () => getElement('#delete-population-select', 'Delete Population Select'),
  modifyPopulationSelect: () => getElement('#modify-population-select', 'Modify Population Select'),
  dashboardPopulationSelect: () => getElement('#dashboard-population-select', 'Dashboard Population Select'),
  // Import buttons
  startImportBtn: () => getElement('#start-import', 'Start Import Button'),
  startImportBtnBottom: () => getElement('#bottom-start-import', 'Bottom Start Import Button'),
  // Settings elements
  settingsSaveStatus: () => getElement('#settings-save-status', 'Settings Save Status'),
  // Import status elements
  importStatus: () => getElement('#import-status', 'Import Status'),
  // Population checkboxes
  useDefaultPopulationCheckbox: () => getElement('#use-default-population', 'Use Default Population Checkbox'),
  useCsvPopulationIdCheckbox: () => getElement('#use-csv-population-id', 'Use CSV Population ID Checkbox'),
  // Get Token button
  getTokenBtn: () => getElement('#get-token-quick', 'Get Token Button'),
  // Population ID form field
  populationIdField: () => getElement('#population-id', 'Population ID Field')
};

// Global exports for subsystem access
if (typeof window !== 'undefined') {
  window.getElement = getElement;
  window.elementCache = elementCache;
  window.ElementRegistry = ElementRegistry;
  console.log('✅ Element registry global exports initialized');
}

},{}],40:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ErrorTypes = exports.ErrorSeverity = exports.ErrorMetadata = exports.ErrorMessages = exports.ErrorCodes = void 0;
exports.createError = createError;
exports.getDefaultMessage = getDefaultMessage;
exports.getDefaultSeverity = getDefaultSeverity;
exports.isErrorType = isErrorType;
/**
 * Error Types
 * 
 * Defines standard error types and severities for consistent error handling
 */

/**
 * Standard error types
 */
const ErrorTypes = exports.ErrorTypes = Object.freeze({
  // Client-side errors
  VALIDATION: 'VALIDATION',
  // Data validation failed
  AUTHENTICATION: 'AUTHENTICATION',
  // Authentication/authorization issues
  AUTHORIZATION: 'AUTHORIZATION',
  // Permission issues
  NETWORK: 'NETWORK',
  // Network connectivity issues
  TIMEOUT: 'TIMEOUT',
  // Request timeouts

  // Server-side errors
  SERVER: 'SERVER',
  // Generic server error (500)
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  // Service unavailable (503)
  NOT_FOUND: 'NOT_FOUND',
  // Resource not found (404)
  CONFLICT: 'CONFLICT',
  // Resource conflict (409)

  // Application-specific errors
  CONFIGURATION: 'CONFIGURATION',
  // Configuration errors
  INTEGRATION: 'INTEGRATION',
  // Third-party service integration errors

  // Fallback
  UNKNOWN: 'UNKNOWN' // Unclassified errors
});

/**
 * Error severity levels
 */
const ErrorSeverity = exports.ErrorSeverity = Object.freeze({
  FATAL: 'FATAL',
  // Application cannot continue
  ERROR: 'ERROR',
  // Operation failed, but application can continue
  WARNING: 'WARNING',
  // Operation completed with issues
  INFO: 'INFO',
  // Informational message
  DEBUG: 'DEBUG' // Debug information
});

/**
 * Standard error codes
 */
const ErrorCodes = exports.ErrorCodes = Object.freeze({
  // Authentication (1000-1099)
  INVALID_CREDENTIALS: 1001,
  SESSION_EXPIRED: 1002,
  INVALID_TOKEN: 1003,
  // Validation (2000-2099)
  INVALID_INPUT: 2001,
  MISSING_REQUIRED_FIELD: 2002,
  INVALID_FORMAT: 2003,
  // Authorization (3000-3099)
  PERMISSION_DENIED: 3001,
  INSUFFICIENT_PERMISSIONS: 3002,
  // Network (4000-4099)
  NETWORK_ERROR: 4001,
  REQUEST_TIMEOUT: 4002,
  // Server (5000-5099)
  INTERNAL_SERVER_ERROR: 5001,
  SERVICE_UNAVAILABLE: 5002,
  // Business Logic (6000-6099)
  DUPLICATE_ENTRY: 6001,
  RESOURCE_NOT_FOUND: 6002,
  // Integration (7000-7099)
  EXTERNAL_SERVICE_ERROR: 7001,
  API_RATE_LIMIT_EXCEEDED: 7002
});

/**
 * Standard error messages
 */
const ErrorMessages = exports.ErrorMessages = Object.freeze({
  [ErrorTypes.VALIDATION]: 'Validation failed',
  [ErrorTypes.AUTHENTICATION]: 'Authentication required',
  [ErrorTypes.AUTHORIZATION]: 'Permission denied',
  [ErrorTypes.NETWORK]: 'Network error occurred',
  [ErrorTypes.TIMEOUT]: 'Request timed out',
  [ErrorTypes.SERVER]: 'Internal server error',
  [ErrorTypes.SERVICE_UNAVAILABLE]: 'Service unavailable',
  [ErrorTypes.NOT_FOUND]: 'Resource not found',
  [ErrorTypes.CONFLICT]: 'Resource conflict',
  [ErrorTypes.CONFIGURATION]: 'Configuration error',
  [ErrorTypes.INTEGRATION]: 'Integration error',
  [ErrorTypes.UNKNOWN]: 'An unexpected error occurred'
});

/**
 * Error metadata
 * Maps error types to their default properties
 */
const ErrorMetadata = exports.ErrorMetadata = Object.freeze({
  [ErrorTypes.VALIDATION]: {
    severity: ErrorSeverity.WARNING,
    isRecoverable: true,
    userMessage: 'Please check your input and try again.'
  },
  [ErrorTypes.AUTHENTICATION]: {
    severity: ErrorSeverity.ERROR,
    isRecoverable: true,
    userMessage: 'Your session has expired. Please log in again.'
  },
  [ErrorTypes.AUTHORIZATION]: {
    severity: ErrorSeverity.ERROR,
    isRecoverable: false,
    userMessage: 'You do not have permission to perform this action.'
  },
  [ErrorTypes.NETWORK]: {
    severity: ErrorSeverity.WARNING,
    isRecoverable: true,
    userMessage: 'Unable to connect to the server. Please check your internet connection.'
  },
  [ErrorTypes.SERVER]: {
    severity: ErrorSeverity.ERROR,
    isRecoverable: false,
    userMessage: 'An unexpected server error occurred. Please try again later.'
  },
  [ErrorTypes.UNKNOWN]: {
    severity: ErrorSeverity.ERROR,
    isRecoverable: false,
    userMessage: 'An unexpected error occurred. Please try again.'
  }
});

/**
 * Creates a standard error object
 * @param {string} type - Error type from ErrorTypes
 * @param {string} message - Error message
 * @param {Object} details - Additional error details
 * @returns {Error} Standardized error object
 */
function createError(type, message) {
  let details = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  const error = new Error(message || ErrorMessages[type] || 'An unknown error occurred');
  error.type = type;
  error.code = details.code || ErrorCodes[type] || 0;
  error.details = details;
  error.timestamp = new Date().toISOString();

  // Add metadata if available
  const metadata = ErrorMetadata[type];
  if (metadata) {
    error.severity = metadata.severity;
    error.isRecoverable = metadata.isRecoverable;
    error.userMessage = metadata.userMessage;
  }
  return error;
}

/**
 * Checks if an error is of a specific type
 * @param {Error} error - The error to check
 * @param {string} type - The error type to check against
 * @returns {boolean} True if the error is of the specified type
 */
function isErrorType(error, type) {
  return error && error.type === type;
}

/**
 * Gets the default error message for an error type
 * @param {string} type - The error type
 * @returns {string} The default error message
 */
function getDefaultMessage(type) {
  return ErrorMessages[type] || 'An unknown error occurred';
}

/**
 * Gets the default severity for an error type
 * @param {string} type - The error type
 * @returns {string} The default severity
 */
function getDefaultSeverity(type) {
  const metadata = ErrorMetadata[type];
  return metadata ? metadata.severity : ErrorSeverity.ERROR;
}

},{}],41:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.MessageFormatter = void 0;
var _winstonLogger = require("./winston-logger.js");
/**
 * Enhanced Message Formatter Module
 * 
 * Improves readability of server messages with:
 * - Visual separators and formatting
 * - Structured message blocks
 * - Event grouping and labeling
 * - Timestamp formatting
 * - Color coding and styling
 * 
 * Features:
 * - Message block separation with asterisks
 * - Event start/end markers
 * - Structured formatting with line breaks
 * - Timestamp and label formatting
 * - Consistent styling across all message types
 */

/**
 * Enhanced Message Formatter Class
 * 
 * Formats server messages for improved readability in logs and progress windows
 */
class MessageFormatter {
  constructor() {
    this.logger = (0, _winstonLogger.createWinstonLogger)({
      service: 'pingone-message-formatter',
      environment: process.env.NODE_ENV || 'development'
    });

    // Message formatting options
    this.formattingOptions = {
      showTimestamps: true,
      showEventMarkers: true,
      showSeparators: true,
      maxMessageLength: 200,
      separatorChar: '*',
      separatorLength: 50
    };

    // Event type configurations
    this.eventTypes = {
      import: {
        start: 'IMPORT STARTED',
        end: 'IMPORT COMPLETED',
        error: 'IMPORT ERROR',
        color: '#3498db'
      },
      export: {
        start: 'EXPORT STARTED',
        end: 'EXPORT COMPLETED',
        error: 'EXPORT ERROR',
        color: '#27ae60'
      },
      modify: {
        start: 'MODIFY STARTED',
        end: 'MODIFY COMPLETED',
        error: 'MODIFY ERROR',
        color: '#f39c12'
      },
      delete: {
        start: 'DELETE STARTED',
        end: 'DELETE COMPLETED',
        error: 'DELETE ERROR',
        color: '#e74c3c'
      },
      validation: {
        start: 'VALIDATION STARTED',
        end: 'VALIDATION COMPLETED',
        error: 'VALIDATION ERROR',
        color: '#9b59b6'
      },
      connection: {
        start: 'CONNECTION ESTABLISHED',
        end: 'CONNECTION CLOSED',
        error: 'CONNECTION ERROR',
        color: '#1abc9c'
      }
    };
  }

  /**
   * Format a message block with visual separators
   * @param {string} eventType - Type of event (import, export, etc.)
   * @param {string} eventStage - Stage of the event (start, end, error, progress)
   * @param {string} message - The main message
   * @param {Object} details - Additional details
   * @returns {string} Formatted message block
   */
  formatMessageBlock(eventType, eventStage, message) {
    let details = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    try {
      const eventConfig = this.eventTypes[eventType] || this.eventTypes.import;
      const timestamp = this.formatTimestamp(new Date());
      const separator = this.createSeparator();
      let formattedMessage = '';

      // Add separator at the beginning
      if (this.formattingOptions.showSeparators) {
        formattedMessage += separator + '\n';
      }

      // Add event marker
      if (this.formattingOptions.showEventMarkers) {
        const marker = this.getEventMarker(eventConfig, eventStage);
        formattedMessage += `${marker}\n`;
      }

      // Add timestamp
      if (this.formattingOptions.showTimestamps) {
        formattedMessage += `[${timestamp}] `;
      }

      // Add main message
      formattedMessage += message + '\n';

      // Add details if present
      if (details && Object.keys(details).length > 0) {
        formattedMessage += this.formatDetails(details);
      }

      // Add separator at the end
      if (this.formattingOptions.showSeparators) {
        formattedMessage += separator + '\n';
      }
      this.logger.debug('Message block formatted', {
        eventType,
        eventStage,
        messageLength: message.length
      });
      return formattedMessage;
    } catch (error) {
      this.logger.error('Error formatting message block', {
        error: error.message
      });
      return message; // Fallback to original message
    }
  }

  /**
   * Format a progress update message
   * @param {string} operation - Operation type
   * @param {number} current - Current progress
   * @param {number} total - Total items
   * @param {string} message - Progress message
   * @param {Object} stats - Progress statistics
   * @returns {string} Formatted progress message
   */
  formatProgressMessage(operation, current, total, message) {
    let stats = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
    try {
      const timestamp = this.formatTimestamp(new Date());
      const percentage = total > 0 ? Math.round(current / total * 100) : 0;
      let formattedMessage = '';

      // Add timestamp
      if (this.formattingOptions.showTimestamps) {
        formattedMessage += `[${timestamp}] `;
      }

      // Add progress indicator
      formattedMessage += `PROGRESS: ${current}/${total} (${percentage}%)`;

      // Add message if provided
      if (message) {
        formattedMessage += ` - ${message}`;
      }

      // Add stats if available
      if (stats && Object.keys(stats).length > 0) {
        formattedMessage += '\n' + this.formatProgressStats(stats);
      }
      return formattedMessage;
    } catch (error) {
      this.logger.error('Error formatting progress message', {
        error: error.message
      });
      return message || `Progress: ${current}/${total}`;
    }
  }

  /**
   * Format an error message with context
   * @param {string} operation - Operation type
   * @param {string} errorMessage - Error message
   * @param {Object} errorDetails - Error details
   * @returns {string} Formatted error message
   */
  formatErrorMessage(operation, errorMessage) {
    let errorDetails = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    try {
      const eventConfig = this.eventTypes[operation] || this.eventTypes.import;
      const timestamp = this.formatTimestamp(new Date());
      const separator = this.createSeparator();
      let formattedMessage = '';

      // Add separator
      if (this.formattingOptions.showSeparators) {
        formattedMessage += separator + '\n';
      }

      // Add error marker
      formattedMessage += `${eventConfig.error}\n`;

      // Add timestamp and error message
      if (this.formattingOptions.showTimestamps) {
        formattedMessage += `[${timestamp}] `;
      }
      formattedMessage += `ERROR: ${errorMessage}\n`;

      // Add error details if present
      if (errorDetails && Object.keys(errorDetails).length > 0) {
        formattedMessage += this.formatErrorDetails(errorDetails);
      }

      // Add separator
      if (this.formattingOptions.showSeparators) {
        formattedMessage += separator + '\n';
      }
      return formattedMessage;
    } catch (error) {
      this.logger.error('Error formatting error message', {
        error: error.message
      });
      return `ERROR: ${errorMessage}`;
    }
  }

  /**
   * Format a completion message with results
   * @param {string} operation - Operation type
   * @param {Object} results - Operation results
   * @returns {string} Formatted completion message
   */
  formatCompletionMessage(operation) {
    let results = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    try {
      const eventConfig = this.eventTypes[operation] || this.eventTypes.import;
      const timestamp = this.formatTimestamp(new Date());
      const separator = this.createSeparator();
      let formattedMessage = '';

      // Add separator
      if (this.formattingOptions.showSeparators) {
        formattedMessage += separator + '\n';
      }

      // Add completion marker
      formattedMessage += `${eventConfig.end}\n`;

      // Add timestamp
      if (this.formattingOptions.showTimestamps) {
        formattedMessage += `[${timestamp}] `;
      }

      // Add completion message
      formattedMessage += `Operation completed successfully\n`;

      // Add results if present
      if (results && Object.keys(results).length > 0) {
        formattedMessage += this.formatResults(results);
      }

      // Add separator
      if (this.formattingOptions.showSeparators) {
        formattedMessage += separator + '\n';
      }
      return formattedMessage;
    } catch (error) {
      this.logger.error('Error formatting completion message', {
        error: error.message
      });
      return 'Operation completed successfully';
    }
  }

  /**
   * Format SSE event data for display
   * @param {Object} eventData - SSE event data
   * @returns {string} Formatted event message
   */
  formatSSEEvent(eventData) {
    try {
      const {
        type,
        message,
        current,
        total,
        counts,
        error
      } = eventData;
      const timestamp = this.formatTimestamp(new Date());
      let formattedMessage = '';

      // Add timestamp
      if (this.formattingOptions.showTimestamps) {
        formattedMessage += `[${timestamp}] `;
      }

      // Format based on event type
      switch (type) {
        case 'progress':
          formattedMessage += this.formatProgressMessage('import', current, total, message, counts);
          break;
        case 'completion':
          formattedMessage += this.formatCompletionMessage('import', eventData);
          break;
        case 'error':
          formattedMessage += this.formatErrorMessage('import', message, eventData);
          break;
        default:
          formattedMessage += `SSE EVENT [${type.toUpperCase()}]: ${message || 'No message'}`;
      }
      return formattedMessage;
    } catch (error) {
      this.logger.error('Error formatting SSE event', {
        error: error.message
      });
      return eventData.message || 'SSE event received';
    }
  }

  /**
   * Create a visual separator line
   * @returns {string} Separator string
   */
  createSeparator() {
    const char = this.formattingOptions.separatorChar;
    const length = this.formattingOptions.separatorLength;
    return char.repeat(length);
  }

  /**
   * Get event marker based on event type and stage
   * @param {Object} eventConfig - Event configuration
   * @param {string} stage - Event stage
   * @returns {string} Event marker
   */
  getEventMarker(eventConfig, stage) {
    switch (stage) {
      case 'start':
        return eventConfig.start;
      case 'end':
        return eventConfig.end;
      case 'error':
        return eventConfig.error;
      default:
        return eventConfig.start;
    }
  }

  /**
   * Format timestamp for display
   * @param {Date} date - Date to format
   * @returns {string} Formatted timestamp
   */
  formatTimestamp(date) {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Format details object for display
   * @param {Object} details - Details object
   * @returns {string} Formatted details
   */
  formatDetails(details) {
    try {
      let formatted = '';
      for (const [key, value] of Object.entries(details)) {
        if (value !== null && value !== undefined) {
          formatted += `  ${key}: ${value}\n`;
        }
      }
      return formatted;
    } catch (error) {
      this.logger.error('Error formatting details', {
        error: error.message
      });
      return '';
    }
  }

  /**
   * Format progress statistics
   * @param {Object} stats - Progress statistics
   * @returns {string} Formatted statistics
   */
  formatProgressStats(stats) {
    try {
      let formatted = '  Statistics:\n';
      const statLabels = {
        processed: 'Processed',
        success: 'Success',
        failed: 'Failed',
        skipped: 'Skipped',
        duplicates: 'Duplicates'
      };
      for (const [key, value] of Object.entries(stats)) {
        if (value !== null && value !== undefined && statLabels[key]) {
          formatted += `    ${statLabels[key]}: ${value}\n`;
        }
      }
      return formatted;
    } catch (error) {
      this.logger.error('Error formatting progress stats', {
        error: error.message
      });
      return '';
    }
  }

  /**
   * Format error details
   * @param {Object} errorDetails - Error details
   * @returns {string} Formatted error details
   */
  formatErrorDetails(errorDetails) {
    try {
      let formatted = '  Error Details:\n';
      for (const [key, value] of Object.entries(errorDetails)) {
        if (value !== null && value !== undefined) {
          formatted += `    ${key}: ${value}\n`;
        }
      }
      return formatted;
    } catch (error) {
      this.logger.error('Error formatting error details', {
        error: error.message
      });
      return '';
    }
  }

  /**
   * Format operation results
   * @param {Object} results - Operation results
   * @returns {string} Formatted results
   */
  formatResults(results) {
    try {
      let formatted = '  Results:\n';
      const resultLabels = {
        total: 'Total Records',
        success: 'Successful',
        failed: 'Failed',
        skipped: 'Skipped',
        duplicates: 'Duplicates',
        duration: 'Duration'
      };
      for (const [key, value] of Object.entries(results)) {
        if (value !== null && value !== undefined && resultLabels[key]) {
          let displayValue = value;
          if (key === 'duration' && typeof value === 'number') {
            displayValue = this.formatDuration(value);
          }
          formatted += `    ${resultLabels[key]}: ${displayValue}\n`;
        }
      }
      return formatted;
    } catch (error) {
      this.logger.error('Error formatting results', {
        error: error.message
      });
      return '';
    }
  }

  /**
   * Format duration in milliseconds to human readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(milliseconds) {
    try {
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      this.logger.error('Error formatting duration', {
        error: error.message
      });
      return `${milliseconds}ms`;
    }
  }

  /**
   * Update formatting options
   * @param {Object} options - New formatting options
   */
  updateFormattingOptions(options) {
    try {
      this.formattingOptions = {
        ...this.formattingOptions,
        ...options
      };
      this.logger.debug('Formatting options updated', {
        options
      });
    } catch (error) {
      this.logger.error('Error updating formatting options', {
        error: error.message
      });
    }
  }

  /**
   * Get current formatting options
   * @returns {Object} Current formatting options
   */
  getFormattingOptions() {
    return {
      ...this.formattingOptions
    };
  }
}

// Create and export singleton instance
exports.MessageFormatter = MessageFormatter;
const messageFormatter = exports.default = new MessageFormatter();

}).call(this)}).call(this,require('_process'))
},{"./winston-logger.js":45,"_process":37}],42:[function(require,module,exports){
(function (process){(function (){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.ProgressManager = void 0;
var _winstonLogger = require("./winston-logger.js");
var _elementRegistry = require("./element-registry.js");
var _sessionManager = require("./session-manager.js");
var _messageFormatter = _interopRequireDefault(require("./message-formatter.js"));
/**
 * Enhanced Progress Manager Module
 * 
 * Modern, real-time progress UI system with Socket.IO and WebSocket fallback:
 * - Real-time updates via Socket.IO (primary)
 * - WebSocket fallback for reliability
 * - Professional Ping Identity design system
 * - Responsive and accessible
 * - Enhanced visual feedback
 * - Step-by-step progress tracking
 * 
 * Features:
 * - Real-time progress updates via Socket.IO
 * - WebSocket fallback for connection issues
 * - Professional progress indicators
 * - Step-by-step operation tracking
 * - Enhanced error handling and recovery
 * - Accessibility compliance
 * - Production-ready logging
 */

// Enable debug mode for development (set to false in production)
const DEBUG_MODE = process.env.NODE_ENV !== 'production';

/**
 * Enhanced Progress Manager Class
 * 
 * Manages all progress-related UI updates with real-time Socket.IO and WebSocket integration
 */
class ProgressManager {
  constructor() {
    this.logger = (0, _winstonLogger.createWinstonLogger)('pingone-progress');
    this.isEnabled = true; // Will be set to false if progress container is not found
    this.currentOperation = null;
    this.currentSessionId = null;
    this.isActive = false;
    this.startTime = null;
    this.timingInterval = null;
    this.progressCallback = null;
    this.completeCallback = null;
    this.cancelCallback = null;
    this.duplicateHandlingMode = 'skip';

    // Real-time communication
    this.socket = null;
    this.websocket = null;
    this.connectionType = null; // 'socketio' or 'websocket'
    this.connectionRetries = 0;
    this.maxRetries = 3;

    // Stats tracking
    this.stats = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.logger.debug('ProgressManager initialized');
  }

  /**
   * Initialize the progress manager and setup core functionality
   */
  initialize() {
    try {
      this.setupElements();
      this.setupEventListeners();
      this.logger.info('Enhanced progress manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize progress manager', {
        error: error.message
      });
    }
  }

  /**
   * Setup DOM elements with enhanced design
   */
  setupElements() {
    try {
      // Main progress container - use existing one from HTML or find operation-specific container
      this.progressContainer = document.getElementById('progress-container');

      // If main container not found, we'll dynamically select the appropriate container based on operation
      if (!this.progressContainer) {
        this.logger.info('Main progress container not found - will use operation-specific containers');
        // We'll set isEnabled to true since we'll find the container dynamically when needed
        this.isEnabled = true;
      }

      // Log the progress container details for debugging
      this.logger.info('Progress container found', {
        id: this.progressContainer.id,
        className: this.progressContainer.className,
        display: this.progressContainer.style.display,
        visibility: this.progressContainer.style.visibility,
        offsetParent: this.progressContainer.offsetParent !== null
      });

      // Create enhanced progress content
      this.progressContainer.innerHTML = `
                <div class="progress-overlay">
                    <div class="progress-modal">
                        <div class="progress-header">
                            <div class="operation-info">
                                <h3 class="operation-title">
                                    <i class="fas fa-cog fa-spin"></i>
                                    <span class="title-text">Operation in Progress</span>
                                </h3>
                                <div class="operation-subtitle">Processing your request...</div>
                            </div>
                            <button class="cancel-operation" type="button" aria-label="Cancel operation">
                                <i class="fas fa-times"></i>
                                <span>Cancel</span>
                            </button>
                        </div>
                        
                        <div class="progress-content">
                            <div class="progress-steps">
                                <div class="step active" data-step="init">
                                    <div class="step-icon">
                                        <i class="fas fa-play"></i>
                                    </div>
                                    <div class="step-label">Initializing</div>
                                </div>
                                <div class="step" data-step="validate">
                                    <div class="step-icon">
                                        <i class="fas fa-check"></i>
                                    </div>
                                    <div class="step-label">Validating</div>
                                </div>
                                <div class="step" data-step="process">
                                    <div class="step-icon">
                                        <i class="fas fa-cogs"></i>
                                    </div>
                                    <div class="step-label">Processing</div>
                                </div>
                                <div class="step" data-step="complete">
                                    <div class="step-icon">
                                        <i class="fas fa-check-circle"></i>
                                    </div>
                                    <div class="step-label">Complete</div>
                                </div>
                            </div>
                            
                            <div class="progress-main">
                                <div class="progress-bar-container">
                                    <div class="progress-bar">
                                        <div class="progress-bar-fill"></div>
                                        <div class="progress-bar-glow"></div>
                                    </div>
                                    <div class="progress-percentage">0%</div>
                                </div>
                                
                                <div class="progress-text">Preparing operation...</div>
                                
                                <div class="progress-stats">
                                    <div class="stat-item">
                                        <span class="stat-label">Processed:</span>
                                        <span class="stat-value processed">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Success:</span>
                                        <span class="stat-value success">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Failed:</span>
                                        <span class="stat-value failed">0</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-label">Skipped:</span>
                                        <span class="stat-value skipped">0</span>
                                    </div>
                                </div>
                                
                                <div class="progress-timing">
                                    <div class="time-elapsed">
                                        <i class="fas fa-clock"></i>
                                        <span>Time: <span class="elapsed-value">00:00</span></span>
                                    </div>
                                    <div class="time-remaining">
                                        <i class="fas fa-hourglass-half"></i>
                                        <span>ETA: <span class="eta-value">Calculating...</span></span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="progress-details">
                                <div class="details-header">
                                    <h4><i class="fas fa-info-circle"></i> Operation Details</h4>
                                </div>
                                <div class="details-content">
                                    <div class="detail-item">
                                        <span class="detail-label">Operation Type:</span>
                                        <span class="detail-value operation-type">-</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Session ID:</span>
                                        <span class="detail-value session-id">-</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Population:</span>
                                        <span class="detail-value population-info">-</span>
                                    </div>
                                    <div class="detail-item">
                                        <span class="detail-label">Connection:</span>
                                        <span class="detail-value connection-type">-</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
      this.logger.debug('Progress elements setup completed');
    } catch (error) {
      this.logger.error('Error setting up progress elements', {
        error: error.message
      });
      this.isEnabled = false;
    }
  }

  /**
   * Setup event listeners for progress interactions
   */
  setupEventListeners() {
    if (!this.isEnabled) {
      this.logger.warn('Progress manager not enabled - skipping event listener setup');
      return;
    }
    try {
      // Cancel operation button
      const cancelButton = this.progressContainer.querySelector('.cancel-operation');
      if (cancelButton) {
        cancelButton.addEventListener('click', () => this.cancelOperation());
      }

      // Close progress button (if exists)
      const closeButton = this.progressContainer.querySelector('.close-progress-btn');
      if (closeButton) {
        closeButton.addEventListener('click', () => this.hideProgress());
      }
      this.logger.debug('Progress event listeners setup completed');
    } catch (error) {
      this.logger.error('Error setting up progress event listeners', {
        error: error.message
      });
    }
  }

  /**
   * Start a new operation with progress tracking
   * @param {string} operationType - Type of operation (import, export, delete, modify)
   * @param {Object} options - Operation options
   * @param {number} options.totalUsers - Total number of users
   * @param {string} options.populationName - Population name
   * @param {string} options.populationId - Population ID
   */
  startOperation(operationType) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    if (!this.isEnabled) {
      this.logger.warn('Progress manager not enabled - cannot start operation');
      return;
    }
    this.currentOperation = operationType;
    this.isActive = true;
    this.startTime = Date.now();
    this.resetOperationStats();

    // Select the appropriate progress container based on operation type
    this.selectProgressContainer(operationType);

    // If we still don't have a progress container, try to create one
    if (!this.progressContainer) {
      this.createFallbackProgressContainer(operationType);
    }

    // If we still don't have a container, we can't proceed
    if (!this.progressContainer) {
      this.logger.error('No progress container available for operation', {
        operationType
      });
      return;
    }

    // Initialize the progress container with content if needed
    this.initializeProgressContainer();

    // Update operation details
    this.updateOperationTitle(operationType);
    this.updateOperationDetails(options);

    // Show progress
    this.showProgress();

    // Start timing updates
    this.startTimingUpdates();
    this.logger.info('Operation started', {
      operationType,
      options
    });
  }

  /**
   * Select the appropriate progress container based on operation type
   * @param {string} operationType - Type of operation (import, export, delete, modify)
   */
  selectProgressContainer(operationType) {
    // If we already have a container, keep using it
    if (this.progressContainer && this.progressContainer.parentNode) {
      return;
    }

    // Try to find operation-specific container first
    const containerMap = {
      'import': 'progress-container',
      'delete': 'progress-container-delete',
      'modify': 'progress-container-modify',
      'export': 'progress-container-export'
    };
    const containerId = containerMap[operationType] || 'progress-container';
    this.progressContainer = document.getElementById(containerId);

    // If not found, try the main progress container
    if (!this.progressContainer) {
      this.progressContainer = document.getElementById('progress-container');
    }

    // Log what we found
    if (this.progressContainer) {
      this.logger.info('Selected progress container', {
        id: this.progressContainer.id,
        operationType
      });
    } else {
      this.logger.warn('No progress container found for operation', {
        operationType
      });
    }
  }

  /**
   * Create a fallback progress container if none exists
   * @param {string} operationType - Type of operation
   */
  createFallbackProgressContainer(operationType) {
    try {
      // Create a simple progress container
      const fallbackContainer = document.createElement('div');
      fallbackContainer.id = 'progress-container-fallback';
      fallbackContainer.className = 'progress-container visible';
      fallbackContainer.style.cssText = `
                display: block !important;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
            `;

      // Add to the document
      document.body.appendChild(fallbackContainer);
      this.progressContainer = fallbackContainer;
      this.logger.info('Created fallback progress container', {
        operationType
      });
    } catch (error) {
      this.logger.error('Failed to create fallback progress container', {
        error: error.message
      });
    }
  }

  /**
   * Initialize the progress container with content if needed
   */
  initializeProgressContainer() {
    // Only initialize if the container is empty
    if (this.progressContainer && !this.progressContainer.querySelector('.progress-overlay')) {
      this.setupElements();
      this.setupEventListeners();
    }
  }

  /**
   * Initialize real-time connection for progress updates
   * @param {string} sessionId - Session ID for tracking
   */
  initializeRealTimeConnection(sessionId) {
    if (!sessionId) {
      this.logger.warn('No session ID provided for real-time connection');
      return;
    }
    this.currentSessionId = sessionId;
    this.connectionRetries = 0;

    // Try Socket.IO first, then fallback to WebSocket
    this.trySocketIOConnection(sessionId);
  }

  /**
   * Try Socket.IO connection for real-time updates
   * @param {string} sessionId - Session ID for tracking
   */
  trySocketIOConnection(sessionId) {
    try {
      // Check if Socket.IO is already loaded globally
      if (typeof io !== 'undefined') {
        this.logger.info('Using global Socket.IO client');
        this.connectWithSocketIO(io, sessionId);
      } else {
        // Try to load Socket.IO dynamically
        this.logger.info('Loading Socket.IO client dynamically');

        // Create a script element to load Socket.IO
        const script = document.createElement('script');
        script.src = '/socket.io/socket.io.js';
        script.async = true;
        script.onload = () => {
          this.logger.info('Socket.IO client loaded successfully');
          if (typeof io !== 'undefined') {
            this.connectWithSocketIO(io, sessionId);
          } else {
            this.logger.warn('Socket.IO loaded but io is undefined, trying WebSocket');
            this.tryWebSocketConnection(sessionId);
          }
        };
        script.onerror = error => {
          this.logger.warn('Failed to load Socket.IO client script', {
            error: error.message
          });
          this.tryWebSocketConnection(sessionId);
        };
        document.head.appendChild(script);
      }
    } catch (error) {
      this.logger.warn('Socket.IO connection setup failed, trying WebSocket', {
        error: error.message
      });
      this.tryWebSocketConnection(sessionId);
    }
  }

  /**
   * Reconnect Socket.IO if connection is lost
   * @param {string} sessionId - Session ID for tracking
   */
  reconnectSocketIO(sessionId) {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.logger.info('Attempting to reconnect Socket.IO', {
      sessionId
    });
    console.log('🔄 [PROGRESS] Attempting to reconnect Socket.IO');

    // Close existing connections
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // Try to reconnect
    setTimeout(() => {
      this.trySocketIOConnection(sessionId);
      this.isReconnecting = false;
    }, 1000);
  }

  /**
   * Connect with Socket.IO
   * @param {Function} io - Socket.IO client function
   * @param {string} sessionId - Session ID for tracking
   */
  connectWithSocketIO(io, sessionId) {
    try {
      // Create Socket.IO connection
      this.socket = io('/', {
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true
      });
      this.socket.on('connect', () => {
        this.connectionType = 'socketio';
        this.updateConnectionType('Socket.IO');
        this.logger.info('Socket.IO connected', {
          sessionId,
          socketId: this.socket.id
        });
        console.log(`🔌 [PROGRESS] Socket.IO connected (ID: ${this.socket.id})`);

        // Join session room
        this.socket.emit('registerSession', sessionId);

        // Also try the join-session event for compatibility
        this.socket.emit('join-session', {
          sessionId
        });
      });
      this.socket.on('progress', data => {
        console.log('🔄 [PROGRESS] Received progress event:', data);
        this.handleProgressEvent(data);
      });
      this.socket.on('completion', data => {
        console.log('✅ [PROGRESS] Received completion event:', data);
        this.handleCompletionEvent(data);
      });

      // Also listen for 'complete' for compatibility
      this.socket.on('complete', data => {
        console.log('✅ [PROGRESS] Received complete event:', data);
        this.handleCompletionEvent(data);
      });
      this.socket.on('error', data => {
        console.log('❌ [PROGRESS] Received error event:', data);
        this.handleErrorEvent(data);
      });
      this.socket.on('disconnect', () => {
        console.log('🔌 [PROGRESS] Socket.IO disconnected');
        this.logger.warn('Socket.IO disconnected');
        this.handleConnectionFailure();
      });
      this.socket.on('connect_error', error => {
        console.log('❌ [PROGRESS] Socket.IO connection error:', error.message);
        this.logger.warn('Socket.IO connection error', {
          error: error.message
        });
        this.handleConnectionFailure();
      });
    } catch (error) {
      this.logger.warn('Socket.IO connection failed, trying WebSocket', {
        error: error.message
      });
      this.tryWebSocketConnection(sessionId);
    }
  }

  /**
   * Try WebSocket connection as fallback
   * @param {string} sessionId - Session ID for tracking
   */
  tryWebSocketConnection(sessionId) {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      this.websocket = new WebSocket(wsUrl);
      this.websocket.onopen = () => {
        this.connectionType = 'websocket';
        this.updateConnectionType('WebSocket');
        this.logger.info('WebSocket connected', {
          sessionId
        });

        // Send session join message
        this.websocket.send(JSON.stringify({
          type: 'join-session',
          sessionId: sessionId
        }));
      };
      this.websocket.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case 'progress':
              this.handleProgressEvent(data);
              break;
            case 'complete':
              this.handleCompletionEvent(data);
              break;
            case 'error':
              this.handleErrorEvent(data);
              break;
          }
        } catch (error) {
          this.logger.error('Error parsing WebSocket message', {
            error: error.message
          });
        }
      };
      this.websocket.onclose = event => {
        this.logger.warn('WebSocket closed', {
          code: event.code,
          reason: event.reason
        });
        this.handleConnectionFailure();
      };
      this.websocket.onerror = error => {
        this.logger.error('WebSocket error', {
          error: error.message
        });
        this.handleConnectionFailure();
      };
    } catch (error) {
      this.logger.error('WebSocket connection failed', {
        error: error.message
      });
      this.handleConnectionFailure();
    }
  }

  /**
   * Handle connection failure and implement fallback strategy
   */
  handleConnectionFailure() {
    this.connectionRetries++;
    if (this.connectionRetries <= this.maxRetries) {
      this.logger.info('Retrying connection', {
        attempt: this.connectionRetries,
        maxRetries: this.maxRetries
      });
      setTimeout(() => {
        if (this.currentSessionId) {
          this.initializeRealTimeConnection(this.currentSessionId);
        }
      }, 1000 * this.connectionRetries); // Exponential backoff
    } else {
      this.logger.warn('Max connection retries reached, falling back to polling');
      this.updateConnectionType('Polling (Fallback)');
    }
  }

  /**
   * Close all real-time connections
   */
  closeConnections() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.websocket) {
      this.websocket.close(1000, 'Operation completed');
      this.websocket = null;
    }
    this.connectionType = null;
    this.logger.debug('Real-time connections closed');
  }

  /**
   * Update session ID for tracking
   * @param {string} sessionId - New session ID
   */
  updateSessionId(sessionId) {
    if (!sessionId) {
      this.logger.warn('No session ID provided for update');
      return;
    }
    this.currentSessionId = sessionId;

    // Update session ID display
    const sessionElement = this.progressContainer.querySelector('.detail-value.session-id');
    if (sessionElement) {
      sessionElement.textContent = sessionId;
    }
    this.logger.info('Session ID updated', {
      sessionId
    });
  }

  /**
   * Handle progress event from real-time connection
   * @param {Object} data - Progress event data
   */
  handleProgressEvent(data) {
    if (!data) {
      this.logger.warn('No progress data received');
      return;
    }
    const {
      current,
      total,
      message,
      counts
    } = data;
    this.updateProgress(current, total, message, counts);
    this.logger.debug('Progress event handled', {
      current,
      total,
      message
    });
  }

  /**
   * Handle completion event from real-time connection
   * @param {Object} data - Completion event data
   */
  handleCompletionEvent(data) {
    this.completeOperation(data);
    this.logger.info('Completion event handled', {
      data
    });
  }

  /**
   * Handle error event from real-time connection
   * @param {Object} data - Error event data
   */
  handleErrorEvent(data) {
    const {
      message,
      details
    } = data;
    this.handleOperationError(message, details);
    this.logger.error('Error event handled', {
      message,
      details
    });
  }

  /**
   * Update progress display with current values
   * @param {number} current - Current progress value
   * @param {number} total - Total progress value
   * @param {string} message - Progress message
   * @param {Object} details - Additional progress details
   */
  updateProgress(current, total) {
    let message = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    let details = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    if (!this.isEnabled || !this.progressContainer) {
      this.logger.warn('Progress manager not enabled or container not found');
      return;
    }

    // Update progress bar
    const progressBar = this.progressContainer.querySelector('.progress-bar-fill');
    if (progressBar) {
      const percentage = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
      progressBar.style.width = `${percentage}%`;
    }

    // Update percentage text
    const percentageElement = this.progressContainer.querySelector('.progress-percentage');
    if (percentageElement) {
      const percentage = total > 0 ? Math.min(100, Math.round(current / total * 100)) : 0;
      percentageElement.textContent = `${percentage}%`;
    }

    // Update progress text
    const progressText = this.progressContainer.querySelector('.progress-text');
    if (progressText && message) {
      progressText.textContent = message;
    }

    // Update step indicator based on progress
    if (total > 0) {
      const percentage = current / total * 100;
      this.updateStepIndicatorBasedOnProgress(percentage);
    }

    // Update statistics if provided
    if (details && typeof details === 'object') {
      this.stats = {
        ...this.stats,
        ...details
      };
      this.updateStatsDisplay();
    }
    this.logger.debug('Progress updated', {
      current,
      total,
      message,
      details
    });
  }

  /**
   * Update statistics display in the UI
   */
  updateStatsDisplay() {
    if (!this.progressContainer) return;
    Object.entries(this.stats).forEach(_ref => {
      let [key, value] = _ref;
      const statElement = this.progressContainer.querySelector(`.stat-value.${key}`);
      if (statElement) {
        statElement.textContent = value || 0;
      }
    });
    this.logger.debug('Statistics display updated', {
      stats: this.stats
    });
  }

  /**
   * Update step indicator based on progress percentage
   * @param {number} percentage - Progress percentage (0-100)
   */
  updateStepIndicatorBasedOnProgress(percentage) {
    let step = 'init';
    if (percentage >= 100) {
      step = 'complete';
    } else if (percentage >= 75) {
      step = 'process';
    } else if (percentage >= 25) {
      step = 'validate';
    }
    this.updateStepIndicator(step);
  }

  /**
   * Update step indicator to show current operation phase
   * @param {string} step - Step name (init, validate, process, complete)
   */
  updateStepIndicator(step) {
    if (!this.progressContainer) return;
    const steps = this.progressContainer.querySelectorAll('.step');
    steps.forEach(stepElement => {
      stepElement.classList.remove('active', 'completed');
    });
    const currentStep = this.progressContainer.querySelector(`[data-step="${step}"]`);
    if (currentStep) {
      currentStep.classList.add('active');
    }

    // Mark previous steps as completed
    const stepOrder = this.getStepOrder(step);
    steps.forEach(stepElement => {
      const stepName = stepElement.getAttribute('data-step');
      const stepIndex = this.getStepOrder(stepName);
      if (stepIndex < stepOrder) {
        stepElement.classList.add('completed');
      }
    });
    this.logger.debug('Step indicator updated', {
      step
    });
  }

  /**
   * Get step order for comparison
   * @param {string} step - Step name
   * @returns {number} Step order (0-3)
   */
  getStepOrder(step) {
    const order = {
      init: 0,
      validate: 1,
      process: 2,
      complete: 3
    };
    return order[step] || 0;
  }

  /**
   * Start timing updates for operation duration
   */
  startTimingUpdates() {
    if (this.timingInterval) {
      clearInterval(this.timingInterval);
    }
    this.timingInterval = setInterval(() => {
      this.updateTiming();
    }, 1000);
    this.logger.debug('Timing updates started');
  }

  /**
   * Update timing display with elapsed time and ETA
   */
  updateTiming() {
    if (!this.startTime || !this.progressContainer) return;
    const elapsed = Date.now() - this.startTime;
    const elapsedElement = this.progressContainer.querySelector('.elapsed-value');
    if (elapsedElement) {
      elapsedElement.textContent = this.formatDuration(elapsed);
    }

    // Calculate ETA if we have progress data
    if (this.stats.total > 0 && this.stats.processed > 0) {
      const progress = this.stats.processed / this.stats.total;
      if (progress > 0) {
        const estimatedTotal = elapsed / progress;
        const remaining = estimatedTotal - elapsed;
        const etaElement = this.progressContainer.querySelector('.eta-value');
        if (etaElement) {
          etaElement.textContent = this.formatDuration(remaining);
        }
      }
    }
    this.logger.debug('Timing updated', {
      elapsed
    });
  }

  /**
   * Complete operation with results
   * @param {Object} results - Operation results
   * @param {number} results.processed - Number of processed items
   * @param {number} results.success - Number of successful items
   * @param {number} results.failed - Number of failed items
   * @param {number} results.skipped - Number of skipped items
   */
  completeOperation() {
    let results = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    if (!this.isEnabled) {
      this.logger.warn('Progress manager not enabled - cannot complete operation');
      return;
    }

    // Stop timing updates
    if (this.timingInterval) {
      clearInterval(this.timingInterval);
      this.timingInterval = null;
    }

    // Close real-time connections
    this.closeConnections();

    // Update final progress
    const {
      processed,
      success,
      failed,
      skipped
    } = results;
    this.updateProgress(processed || 0, processed || 0, 'Operation completed');

    // Update final statistics
    this.stats = {
      ...this.stats,
      ...results
    };
    this.updateStatsDisplay();

    // Mark as complete
    this.updateStepIndicator('complete');

    // Call completion callback if provided
    if (this.completeCallback && typeof this.completeCallback === 'function') {
      this.completeCallback(results);
    }
    this.isActive = false;
    this.logger.info('Operation completed', {
      results
    });
  }

  /**
   * Handle operation error
   * @param {string} message - Error message
   * @param {Object} details - Error details
   */
  handleOperationError(message) {
    let details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    if (!this.isEnabled) {
      this.logger.warn('Progress manager not enabled - cannot handle error');
      return;
    }

    // Stop timing updates
    if (this.timingInterval) {
      clearInterval(this.timingInterval);
      this.timingInterval = null;
    }

    // Close real-time connections
    this.closeConnections();

    // Update progress text with error
    const progressText = this.progressContainer.querySelector('.progress-text');
    if (progressText) {
      progressText.textContent = `Error: ${message}`;
      progressText.classList.add('error');
    }
    this.isActive = false;
    this.logger.error('Operation error', {
      message,
      details
    });
  }

  /**
   * Cancel current operation
   */
  cancelOperation() {
    if (!this.isEnabled || !this.isActive) {
      this.logger.warn('No active operation to cancel');
      return;
    }

    // Stop timing updates
    if (this.timingInterval) {
      clearInterval(this.timingInterval);
      this.timingInterval = null;
    }

    // Close real-time connections
    this.closeConnections();

    // Call cancel callback if provided
    if (this.cancelCallback && typeof this.cancelCallback === 'function') {
      this.cancelCallback();
    }
    this.isActive = false;
    this.hideProgress();
    this.logger.info('Operation cancelled');
  }

  /**
   * Show progress display
   */
  showProgress() {
    if (!this.isEnabled || !this.progressContainer) {
      this.logger.warn('Progress manager not enabled or container not found');
      return;
    }

    // Make sure the container is visible
    this.progressContainer.style.display = 'block';
    this.progressContainer.classList.add('visible');

    // Force visibility with !important to override any CSS that might hide it
    this.progressContainer.setAttribute('style', 'display: block !important; visibility: visible !important;');

    // Focus management for accessibility
    const cancelButton = this.progressContainer.querySelector('.cancel-operation');
    if (cancelButton) {
      cancelButton.focus();
    }
    this.logger.debug('Progress display shown', {
      containerId: this.progressContainer.id
    });

    // Log to console for debugging
    console.log(`🔍 [PROGRESS] Showing progress container: ${this.progressContainer.id}`);
  }

  /**
   * Hide progress display
   */
  hideProgress() {
    if (!this.progressContainer) return;

    // Log before hiding
    this.logger.debug('Hiding progress display', {
      containerId: this.progressContainer.id
    });
    console.log(`🔍 [PROGRESS] Hiding progress container: ${this.progressContainer.id}`);
    this.progressContainer.classList.remove('visible');

    // Immediately hide the container
    this.progressContainer.style.display = 'none';
    this.logger.debug('Progress display hidden');
  }

  /**
   * Update operation title
   * @param {string} operationType - Type of operation
   */
  updateOperationTitle(operationType) {
    if (!this.progressContainer) return;
    const titleElement = this.progressContainer.querySelector('.title-text');
    if (titleElement) {
      const titles = {
        import: 'Import Users',
        export: 'Export Users',
        delete: 'Delete Users',
        modify: 'Modify Users'
      };
      titleElement.textContent = titles[operationType] || 'Operation in Progress';
    }
    this.logger.debug('Operation title updated', {
      operationType
    });
  }

  /**
   * Update operation details
   * @param {Object} options - Operation options
   * @param {string} options.populationName - Population name
   * @param {string} options.populationId - Population ID
   * @param {number} options.totalUsers - Total number of users
   */
  updateOperationDetails() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    if (!this.progressContainer) return;
    const {
      populationName,
      populationId,
      totalUsers
    } = options;

    // Update operation type
    const operationTypeElement = this.progressContainer.querySelector('.detail-value.operation-type');
    if (operationTypeElement) {
      operationTypeElement.textContent = this.currentOperation || 'Unknown';
    }

    // Update population info
    const populationElement = this.progressContainer.querySelector('.detail-value.population-info');
    if (populationElement) {
      populationElement.textContent = populationName || populationId || 'Unknown';
    }

    // Update total users in stats
    if (totalUsers) {
      this.stats.total = totalUsers;
      this.updateStatsDisplay();
    }
    this.logger.debug('Operation details updated', {
      options
    });
  }

  /**
   * Update operation status
   * @param {string} status - Operation status
   * @param {string} message - Status message
   */
  updateOperationStatus(status) {
    let message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    if (!this.progressContainer) return;
    const subtitleElement = this.progressContainer.querySelector('.operation-subtitle');
    if (subtitleElement) {
      subtitleElement.textContent = message || status;
    }
    this.logger.debug('Operation status updated', {
      status,
      message
    });
  }

  /**
   * Update connection type display
   * @param {string} type - Connection type
   */
  updateConnectionType(type) {
    if (!this.progressContainer) return;
    const connectionElement = this.progressContainer.querySelector('.detail-value.connection-type');
    if (connectionElement) {
      connectionElement.textContent = type;
    }
    this.logger.debug('Connection type updated', {
      type
    });
  }

  /**
   * Reset operation statistics
   */
  resetOperationStats() {
    this.stats = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      total: 0
    };
    this.updateStatsDisplay();
    this.logger.debug('Operation statistics reset');
  }

  /**
   * Format duration in milliseconds to human readable string
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} Formatted duration string
   */
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Set progress callback function
   * @param {Function} callback - Progress callback function
   */
  setProgressCallback(callback) {
    this.progressCallback = callback;
    this.logger.debug('Progress callback set');
  }

  /**
   * Set completion callback function
   * @param {Function} callback - Completion callback function
   */
  setCompleteCallback(callback) {
    this.completeCallback = callback;
    this.logger.debug('Completion callback set');
  }

  /**
   * Set cancel callback function
   * @param {Function} callback - Cancel callback function
   */
  setCancelCallback(callback) {
    this.cancelCallback = callback;
    this.logger.debug('Cancel callback set');
  }

  /**
   * Debug logging for development
   * @param {string} area - Debug area
   * @param {string} message - Debug message
   */
  debugLog(area, message) {
    if (DEBUG_MODE) {
      this.logger.debug(`[${area}] ${message}`);
    }
  }

  /**
   * Clean up resources and destroy the progress manager
   */
  destroy() {
    // Stop timing updates
    if (this.timingInterval) {
      clearInterval(this.timingInterval);
      this.timingInterval = null;
    }

    // Close connections
    this.closeConnections();

    // Clear callbacks
    this.progressCallback = null;
    this.completeCallback = null;
    this.cancelCallback = null;

    // Reset state
    this.isActive = false;
    this.currentOperation = null;
    this.currentSessionId = null;
    this.logger.info('Progress manager destroyed');
  }
}

// Create and export default instance
exports.ProgressManager = ProgressManager;
const progressManager = new ProgressManager();

// Export the class and instance
var _default = exports.default = progressManager;

}).call(this)}).call(this,require('_process'))
},{"./element-registry.js":39,"./message-formatter.js":41,"./session-manager.js":43,"./winston-logger.js":45,"@babel/runtime/helpers/interopRequireDefault":1,"_process":37}],43:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.sessionManager = exports.default = void 0;
var _winstonLogger = require("./winston-logger.js");
/**
 * Session Manager for PingOne Import Tool
 * 
 * Handles session ID generation, validation, and management for SSE connections
 * across all operations (import, export, modify, delete).
 * 
 * Features:
 * - Centralized session ID generation
 * - Session ID validation and format checking
 * - Session tracking and cleanup
 * - Error handling for missing/invalid session IDs
 */

/**
 * Session Manager Class
 */
class SessionManager {
  constructor() {
    this.logger = (0, _winstonLogger.createWinstonLogger)({
      service: 'pingone-import-session',
      environment: process.env.NODE_ENV || 'development'
    });
    this.activeSessions = new Map();
    this.sessionCounter = 0;
  }

  /**
   * Generate a unique session ID
   * @returns {string} Unique session identifier
   */
  generateSessionId() {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const counter = ++this.sessionCounter;
      const sessionId = `session_${timestamp}_${random}_${counter}`;
      this.logger.debug('Session ID generated', {
        sessionId
      });
      return sessionId;
    } catch (error) {
      this.logger.error('Error generating session ID', {
        error: error.message
      });
      // Fallback to simple timestamp-based ID
      return `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }
  }

  /**
   * Validate session ID format and structure
   * @param {string} sessionId - Session ID to validate
   * @returns {boolean} True if valid, false otherwise
   */
  validateSessionId(sessionId) {
    try {
      if (!sessionId || typeof sessionId !== 'string') {
        this.logger.warn('Session ID validation failed: null/undefined/non-string', {
          sessionId,
          type: typeof sessionId
        });
        return false;
      }
      if (sessionId.trim() === '') {
        this.logger.warn('Session ID validation failed: empty string');
        return false;
      }

      // Check for minimum length (should be at least 8 characters)
      if (sessionId.length < 8) {
        this.logger.warn('Session ID validation failed: too short', {
          length: sessionId.length
        });
        return false;
      }

      // Check for valid characters (alphanumeric, underscore, hyphen)
      const validPattern = /^[a-zA-Z0-9_-]+$/;
      if (!validPattern.test(sessionId)) {
        this.logger.warn('Session ID validation failed: invalid characters', {
          sessionId
        });
        return false;
      }
      this.logger.debug('Session ID validation passed', {
        sessionId
      });
      return true;
    } catch (error) {
      this.logger.error('Error validating session ID', {
        error: error.message,
        sessionId
      });
      return false;
    }
  }

  /**
   * Register an active session
   * @param {string} sessionId - Session ID to register
   * @param {string} operationType - Type of operation (import, export, etc.)
   * @param {Object} metadata - Additional session metadata
   */
  registerSession(sessionId, operationType) {
    let metadata = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    try {
      if (!this.validateSessionId(sessionId)) {
        this.logger.error('Cannot register invalid session ID', {
          sessionId,
          operationType
        });
        return false;
      }
      const sessionData = {
        sessionId,
        operationType,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        metadata
      };
      this.activeSessions.set(sessionId, sessionData);
      this.logger.info('Session registered', {
        sessionId,
        operationType,
        metadata
      });
      return true;
    } catch (error) {
      this.logger.error('Error registering session', {
        error: error.message,
        sessionId,
        operationType
      });
      return false;
    }
  }

  /**
   * Update session activity timestamp
   * @param {string} sessionId - Session ID to update
   */
  updateSessionActivity(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.lastActivity = Date.now();
        this.logger.debug('Session activity updated', {
          sessionId
        });
      } else {
        this.logger.warn('Session not found for activity update', {
          sessionId
        });
      }
    } catch (error) {
      this.logger.error('Error updating session activity', {
        error: error.message,
        sessionId
      });
    }
  }

  /**
   * Unregister a session
   * @param {string} sessionId - Session ID to unregister
   */
  unregisterSession(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        this.activeSessions.delete(sessionId);
        this.logger.info('Session unregistered', {
          sessionId,
          operationType: session.operationType
        });
      } else {
        this.logger.warn('Session not found for unregistration', {
          sessionId
        });
      }
    } catch (error) {
      this.logger.error('Error unregistering session', {
        error: error.message,
        sessionId
      });
    }
  }

  /**
   * Get session information
   * @param {string} sessionId - Session ID to retrieve
   * @returns {Object|null} Session data or null if not found
   */
  getSession(sessionId) {
    try {
      return this.activeSessions.get(sessionId) || null;
    } catch (error) {
      this.logger.error('Error getting session', {
        error: error.message,
        sessionId
      });
      return null;
    }
  }

  /**
   * Get all active sessions
   * @returns {Array} Array of active session data
   */
  getActiveSessions() {
    try {
      return Array.from(this.activeSessions.values());
    } catch (error) {
      this.logger.error('Error getting active sessions', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Clean up expired sessions
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupExpiredSessions() {
    let maxAge = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 60 * 60 * 1000;
    try {
      const now = Date.now();
      const expiredSessions = [];
      for (const [sessionId, session] of this.activeSessions.entries()) {
        if (now - session.lastActivity > maxAge) {
          expiredSessions.push(sessionId);
        }
      }
      expiredSessions.forEach(sessionId => {
        this.unregisterSession(sessionId);
      });
      if (expiredSessions.length > 0) {
        this.logger.info('Cleaned up expired sessions', {
          count: expiredSessions.length
        });
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions', {
        error: error.message
      });
    }
  }

  /**
   * Get session statistics
   * @returns {Object} Session statistics
   */
  getSessionStats() {
    try {
      const sessions = this.getActiveSessions();
      const stats = {
        total: sessions.length,
        byOperation: {},
        oldest: null,
        newest: null
      };
      sessions.forEach(session => {
        // Count by operation type
        stats.byOperation[session.operationType] = (stats.byOperation[session.operationType] || 0) + 1;

        // Track oldest and newest
        if (!stats.oldest || session.createdAt < stats.oldest.createdAt) {
          stats.oldest = session;
        }
        if (!stats.newest || session.createdAt > stats.newest.createdAt) {
          stats.newest = session;
        }
      });
      return stats;
    } catch (error) {
      this.logger.error('Error getting session stats', {
        error: error.message
      });
      return {
        total: 0,
        byOperation: {},
        oldest: null,
        newest: null
      };
    }
  }
}

// Export singleton instance
const sessionManager = exports.sessionManager = new SessionManager();
var _default = exports.default = sessionManager;

}).call(this)}).call(this,require('_process'))
},{"./winston-logger.js":45,"_process":37}],44:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * Safe DOM Utilities
 * 
 * Provides safe DOM manipulation methods with error handling and validation.
 * Used throughout the application for robust DOM operations.
 */

class SafeDOM {
  constructor() {
    let logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : console;
    this.logger = logger;
  }

  /**
   * Safely get an element by ID
   * @param {string} id - Element ID
   * @returns {Element|null} Element or null if not found
   */
  getElementById(id) {
    try {
      return document.getElementById(id);
    } catch (error) {
      this.logger.error('Error getting element by ID:', {
        id,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely query selector
   * @param {string} selector - CSS selector
   * @returns {Element|null} Element or null if not found
   */
  querySelector(selector) {
    try {
      return document.querySelector(selector);
    } catch (error) {
      this.logger.error('Error with querySelector:', {
        selector,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely query all selectors
   * @param {string} selector - CSS selector
   * @returns {NodeList|Array} NodeList or empty array if error
   */
  querySelectorAll(selector) {
    try {
      return document.querySelectorAll(selector);
    } catch (error) {
      this.logger.error('Error with querySelectorAll:', {
        selector,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Safely set text content
   * @param {Element} element - DOM element
   * @param {string} text - Text to set
   */
  setText(element, text) {
    try {
      if (element && typeof element.textContent !== 'undefined') {
        element.textContent = text;
      }
    } catch (error) {
      this.logger.error('Error setting text content:', {
        text,
        error: error.message
      });
    }
  }

  /**
   * Safely set HTML content
   * @param {Element} element - DOM element
   * @param {string} html - HTML to set
   */
  setHTML(element, html) {
    try {
      if (element && typeof element.innerHTML !== 'undefined') {
        element.innerHTML = html;
      }
    } catch (error) {
      this.logger.error('Error setting HTML content:', {
        html,
        error: error.message
      });
    }
  }

  /**
   * Safely show element
   * @param {Element} element - DOM element
   */
  show(element) {
    try {
      if (element && element.style) {
        element.style.display = 'block';
      }
    } catch (error) {
      this.logger.error('Error showing element:', {
        error: error.message
      });
    }
  }

  /**
   * Safely hide element
   * @param {Element} element - DOM element
   */
  hide(element) {
    try {
      if (element && element.style) {
        element.style.display = 'none';
      }
    } catch (error) {
      this.logger.error('Error hiding element:', {
        error: error.message
      });
    }
  }

  /**
   * Safely add class
   * @param {Element} element - DOM element
   * @param {string} className - Class name to add
   */
  addClass(element, className) {
    try {
      if (element && element.classList) {
        element.classList.add(className);
      }
    } catch (error) {
      this.logger.error('Error adding class:', {
        className,
        error: error.message
      });
    }
  }

  /**
   * Safely remove class
   * @param {Element} element - DOM element
   * @param {string} className - Class name to remove
   */
  removeClass(element, className) {
    try {
      if (element && element.classList) {
        element.classList.remove(className);
      }
    } catch (error) {
      this.logger.error('Error removing class:', {
        className,
        error: error.message
      });
    }
  }

  /**
   * Safely set attribute
   * @param {Element} element - DOM element
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   */
  setAttribute(element, name, value) {
    try {
      if (element && typeof element.setAttribute === 'function') {
        element.setAttribute(name, value);
      }
    } catch (error) {
      this.logger.error('Error setting attribute:', {
        name,
        value,
        error: error.message
      });
    }
  }

  /**
   * Safely get attribute
   * @param {Element} element - DOM element
   * @param {string} name - Attribute name
   * @returns {string|null} Attribute value or null
   */
  getAttribute(element, name) {
    try {
      if (element && typeof element.getAttribute === 'function') {
        return element.getAttribute(name);
      }
      return null;
    } catch (error) {
      this.logger.error('Error getting attribute:', {
        name,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Safely add event listener
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  addEventListener(element, event, handler) {
    try {
      if (element && typeof element.addEventListener === 'function') {
        element.addEventListener(event, handler);
      }
    } catch (error) {
      this.logger.error('Error adding event listener:', {
        event,
        error: error.message
      });
    }
  }

  /**
   * Safely remove event listener
   * @param {Element} element - DOM element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  removeEventListener(element, event, handler) {
    try {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(event, handler);
      }
    } catch (error) {
      this.logger.error('Error removing event listener:', {
        event,
        error: error.message
      });
    }
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.SafeDOM = SafeDOM;
  window.safeDOM = new SafeDOM(window.logger || console);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SafeDOM;
}

// Export for ES modules (moved to top level)
var _default = exports.default = SafeDOM;

},{}],45:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.apiLogger = exports.WinstonLogger = void 0;
exports.createComponentLogger = createComponentLogger;
exports.createWinstonLogger = createWinstonLogger;
exports.uiLogger = exports.tokenLogger = exports.settingsLogger = exports.fileLogger = exports.defaultLogger = void 0;
/**
 * @fileoverview Winston-compatible logger for frontend/browser environment
 * 
 * This module provides a Winston-like logging interface for the frontend
 * that maintains consistency with server-side Winston logging while
 * working within browser constraints.
 * 
 * Features:
 * - Winston-compatible API (info, warn, error, debug)
 * - Structured logging with metadata
 * - Timestamp formatting
 * - Log level filtering
 * - Console and server transport support
 * - Error stack trace handling
 * - Environment-aware configuration
 */

/**
 * Winston-compatible logger for browser environment
 */
class WinstonLogger {
  constructor() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.level = options.level || this.getDefaultLevel();
    this.service = options.service || 'pingone-import-frontend';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.enableServerLogging = options.enableServerLogging !== false;
    this.enableConsoleLogging = options.enableConsoleLogging !== false;

    // Log level hierarchy
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Initialize transports
    this.transports = [];
    this.initializeTransports();
  }

  /**
   * Get default log level based on environment
   */
  getDefaultLevel() {
    if (this.environment === 'production') {
      return 'info';
    } else if (this.environment === 'test') {
      return 'warn';
    } else {
      return 'debug';
    }
  }

  /**
   * Initialize logging transports
   */
  initializeTransports() {
    // Console transport
    if (this.enableConsoleLogging) {
      this.transports.push({
        name: 'console',
        log: (level, message, meta) => this.logToConsole(level, message, meta)
      });
    }

    // Server transport (if enabled)
    if (this.enableServerLogging) {
      this.transports.push({
        name: 'server',
        log: (level, message, meta) => this.logToServer(level, message, meta)
      });
    }
  }

  /**
   * Check if a log level should be logged
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  /**
   * Format timestamp
   */
  formatTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log entry
   */
  formatLogEntry(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const timestamp = this.formatTimestamp();
    return {
      timestamp,
      level,
      message,
      service: this.service,
      environment: this.environment,
      ...meta
    };
  }

  /**
   * Log to console with Winston-like formatting
   */
  logToConsole(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!this.shouldLog(level)) return;
    const logEntry = this.formatLogEntry(level, message, meta);
    const timestamp = logEntry.timestamp;
    const levelUpper = level.toUpperCase();

    // Create formatted console message
    let consoleMessage = `[${timestamp}] [${this.service}] ${levelUpper}: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      consoleMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }

    // Use appropriate console method
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'info':
        console.info(consoleMessage);
        break;
      case 'debug':
        console.debug(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }
  }

  /**
   * Log to server via API endpoint
   */
  async logToServer(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!this.shouldLog(level)) return;
    try {
      // Format the request body according to the API expectations
      const requestBody = {
        message,
        level,
        data: meta,
        source: 'frontend'
      };

      // Send to server logging endpoint
      await fetch('/api/logs/ui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (error) {
      // Handle connection refused errors silently during startup
      if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        // Don't log connection refused errors to avoid console spam during startup
        return;
      }
      // Fallback to console if server logging fails
      console.warn('Server logging failed, falling back to console:', error.message);
      this.logToConsole(level, message, meta);
    }
  }

  /**
   * Main logging method
   */
  log(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!this.shouldLog(level)) return;

    // Send to all transports
    this.transports.forEach(transport => {
      try {
        transport.log(level, message, meta);
      } catch (error) {
        console.error(`Error in ${transport.name} transport:`, error);
      }
    });
  }

  /**
   * Log info level message
   */
  info(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('info', message, meta);
  }

  /**
   * Log warn level message
   */
  warn(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('warn', message, meta);
  }

  /**
   * Log error level message
   */
  error(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('error', message, meta);
  }

  /**
   * Log debug level message
   */
  debug(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('debug', message, meta);
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message, error) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const errorMeta = {
      ...meta,
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code,
        name: error.name
      }
    };
    this.error(message, errorMeta);
  }

  /**
   * Create child logger with additional metadata
   */
  child() {
    var _this = this;
    let additionalMeta = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const childLogger = new WinstonLogger({
      level: this.level,
      service: this.service,
      environment: this.environment,
      enableServerLogging: this.enableServerLogging,
      enableConsoleLogging: this.enableConsoleLogging
    });

    // Override formatLogEntry to include additional metadata
    childLogger.formatLogEntry = function (level, message) {
      let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      const baseEntry = _this.formatLogEntry(level, message, meta);
      return {
        ...baseEntry,
        ...additionalMeta
      };
    };
    return childLogger;
  }

  /**
   * Set log level
   */
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.level = level;
    } else {
      this.warn(`Invalid log level: ${level}`);
    }
  }

  /**
   * Enable/disable server logging
   */
  setServerLogging(enabled) {
    this.enableServerLogging = enabled;

    // Update transports
    this.transports = this.transports.filter(t => t.name !== 'server');
    if (enabled) {
      this.transports.push({
        name: 'server',
        log: (level, message, meta) => this.logToServer(level, message, meta)
      });
    }
  }

  /**
   * Enable/disable console logging
   */
  setConsoleLogging(enabled) {
    this.enableConsoleLogging = enabled;

    // Update transports
    this.transports = this.transports.filter(t => t.name !== 'console');
    if (enabled) {
      this.transports.push({
        name: 'console',
        log: (level, message, meta) => this.logToConsole(level, message, meta)
      });
    }
  }
}

/**
 * Create default logger instance
 */
exports.WinstonLogger = WinstonLogger;
function createWinstonLogger() {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return new WinstonLogger(options);
}

/**
 * Create component-specific logger
 */
function createComponentLogger(component) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  return createWinstonLogger({
    ...options,
    service: `${options.service || 'pingone-import'}-${component}`
  });
}

/**
 * Default logger instances
 */
const defaultLogger = exports.defaultLogger = createWinstonLogger();
const apiLogger = exports.apiLogger = createComponentLogger('api');
const uiLogger = exports.uiLogger = createComponentLogger('ui');
const fileLogger = exports.fileLogger = createComponentLogger('file');
const settingsLogger = exports.settingsLogger = createComponentLogger('settings');
const tokenLogger = exports.tokenLogger = createComponentLogger('token');

// Export the class for custom instances

}).call(this)}).call(this,require('_process'))
},{"_process":37}],46:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _logger = require("./utils/logger.js");
var _uiManager = require("./components/ui-manager.js");
var _localApiClient = _interopRequireDefault(require("./utils/local-api-client.js"));
var _settingsSubsystem = _interopRequireDefault(require("./subsystems/settings-subsystem.js"));
var _eventBus = require("./utils/event-bus.js");
var _credentialsManager = _interopRequireDefault(require("./components/credentials-manager.js"));
var _settingsManager = _interopRequireDefault(require("./components/settings-manager.js"));
var _pingoneClient = _interopRequireDefault(require("./utils/pingone-client.js"));
var _connectionManagerSubsystem = require("./subsystems/connection-manager-subsystem.js");
var _authManagementSubsystem = require("./subsystems/auth-management-subsystem.js");
var _advancedRealtimeSubsystem = require("./subsystems/advanced-realtime-subsystem.js");
var _viewManagementSubsystem = require("./subsystems/view-management-subsystem.js");
var _operationManagerSubsystem = require("./subsystems/operation-manager-subsystem.js");
var _populationSubsystem = require("./subsystems/population-subsystem.js");
var _historySubsystem = require("./subsystems/history-subsystem.js");
var _importSubsystem = require("./subsystems/import-subsystem.js");
var _navigationSubsystem = require("./subsystems/navigation-subsystem.js");
// Assuming path

// Assuming path

class App {
  constructor() {
    this.version = 'loading...'; // Will be loaded dynamically from server
    this.logger = new _logger.Logger('pingone-import-app', 'dezh8e30');
    this.eventBus = new _eventBus.EventBus(this.logger.child({
      component: 'event-bus'
    }));
    this.uiManager = new _uiManager.UIManager(this.logger.child({
      component: 'ui-manager'
    }));
    this.localClient = new _localApiClient.default('/api/v1', this.logger.child({
      component: 'local-api-client'
    }));
    this.subsystems = {};
    window.app = this; // For debugging
  }
  async init() {
    this.logger.info('Initializing application...');
    this.uiManager.showStartupWaitScreen('Initializing application...');
    try {
      // Load version first
      await this.loadVersion();
      await this.initializeCoreComponents();
      await this.initializeSubsystems();
      // No longer needed, handled by NavigationSubsystem
      // this.setupEventListeners();

      this.logger.info('Application initialized successfully.');
      this.uiManager.hideStartupWaitScreen();
    } catch (error) {
      this.logger.error('Application initialization failed:', {
        error: error.message,
        stack: error.stack
      });
      this.uiManager.showError('Application failed to start. Please check the console for details.');
    }
  }

  /**
   * Load application version from server
   */
  async loadVersion() {
    try {
      this.uiManager.updateStartupMessage('Loading version information...');
      const response = await fetch('/api/version');
      if (response.ok) {
        const versionData = await response.json();
        this.version = versionData.version;
        this.logger.info('Version loaded from server:', {
          version: this.version
        });

        // Update version display immediately
        this.updateVersionDisplay();
      } else {
        throw new Error(`Failed to load version: ${response.status}`);
      }
    } catch (error) {
      this.logger.warn('Failed to load version from server, using fallback:', {
        error: error.message
      });
      this.version = '6.5.1.3'; // Fallback version
      this.updateVersionDisplay();
    }
  }

  /**
   * Update version display in UI
   */
  updateVersionDisplay() {
    try {
      // Update version widget
      const versionDisplay = document.getElementById('version-display');
      if (versionDisplay) {
        versionDisplay.textContent = `v${this.version}`;
      }

      // Update page title
      document.title = `PingOne User Import v${this.version}`;
      this.logger.debug('Version display updated:', {
        version: this.version
      });
    } catch (error) {
      this.logger.error('Failed to update version display:', {
        error: error.message
      });
    }
  }
  async initializeCoreComponents() {
    this.logger.debug('Initializing core components');
    this.uiManager.setupUI();
    this.settingsManager = new _settingsManager.default(this.logger.child({
      component: 'settings-manager'
    }));
    await this.settingsManager.init();
    this.logger.debug('Settings manager initialized');
    this.settingsSubsystem = new _settingsSubsystem.default(this.logger.child({
      subsystem: 'settings'
    }), this.uiManager, this.localClient, this.settingsManager, this.eventBus);
    await this.settingsSubsystem.init();
    this.logger.debug('Settings subsystem initialized as a core component');
    this.pingoneClient = new _pingoneClient.default(this.localClient, this.logger.child({
      component: 'pingone-client'
    }));
    this.logger.debug('PingOne client created successfully');
    this.logger.debug('Core components initialized');
  }
  async initializeSubsystems() {
    this.logger.info('Initializing subsystems...');
    this.uiManager.updateStartupMessage('Initializing subsystems...');

    // Ensure NavigationSubsystem gets the correct app reference and settingsManager is initialized
    const subsystemConfigs = [{
      name: 'navigationSubsystem',
      constructor: _navigationSubsystem.NavigationSubsystem,
      deps: [this.logger.child({
        subsystem: 'navigation'
      }), this.uiManager, this.settingsManager, this]
    }, {
      name: 'connectionManager',
      constructor: _connectionManagerSubsystem.ConnectionManagerSubsystem,
      deps: [this.logger.child({
        subsystem: 'connection'
      }), this.eventBus, this.uiManager, this.localClient]
    }, {
      name: 'realtimeManager',
      constructor: _advancedRealtimeSubsystem.AdvancedRealtimeSubsystem,
      deps: [this.logger.child({
        subsystem: 'realtime'
      }), this.eventBus]
    }, {
      name: 'authManager',
      constructor: _authManagementSubsystem.AuthManagementSubsystem,
      deps: [this.logger.child({
        subsystem: 'auth'
      }), this.pingoneClient, this.eventBus, this.uiManager, this.localClient]
    }, {
      name: 'viewManager',
      constructor: _viewManagementSubsystem.ViewManagementSubsystem,
      deps: [this.logger.child({
        subsystem: 'view'
      }), this.uiManager, this.eventBus]
    }, {
      name: 'operationManager',
      constructor: _operationManagerSubsystem.OperationManagerSubsystem,
      deps: [this.logger.child({
        subsystem: 'operation'
      }), this.eventBus, this.uiManager]
    }, {
      name: 'populationSubsystem',
      constructor: _populationSubsystem.PopulationSubsystem,
      deps: [this.logger.child({
        subsystem: 'population'
      }), this.localClient, this.eventBus]
    }, {
      name: 'historySubsystem',
      constructor: _historySubsystem.HistorySubsystem,
      deps: [this.logger.child({
        subsystem: 'history'
      }), this.localClient, this.uiManager, this.eventBus]
    }, {
      name: 'importSubsystem',
      constructor: _importSubsystem.ImportSubsystem,
      deps: [this.logger.child({
        subsystem: 'import'
      }), this.uiManager, this.localClient, this.eventBus, () => this.subsystems.authManager]
    }];
    for (const config of subsystemConfigs) {
      try {
        this.logger.debug(`Initializing ${config.name} subsystem...`);
        const resolvedDeps = config.deps.map(dep => typeof dep === 'function' ? dep() : dep);
        this.subsystems[config.name] = new config.constructor(...resolvedDeps);
        if (typeof this.subsystems[config.name].init === 'function') {
          await this.subsystems[config.name].init();
        }
      } catch (error) {
        this.logger.error(`Failed to initialize subsystem: ${config.name}`, {
          error: error.message,
          stack: error.stack
        });
        throw new Error(`Subsystem initialization failed for ${config.name}`);
      }
    }
    this.logger.info('All subsystems initialized successfully.');
  }
  setupEventListeners() {
    this.logger.debug('Setting up global event listeners');

    // Centralized error handling
    window.addEventListener('error', event => {
      this.logger.error('Unhandled global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : 'N/A'
      });
    });
    window.addEventListener('unhandledrejection', event => {
      this.logger.warn('Unhandled promise rejection:', {
        reason: event.reason ? event.reason.stack : 'N/A'
      });
    });
    this.logger.debug('Global event listeners set up');
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('FATAL: Application failed to initialize.', err);
    // Display a fatal error message to the user if UI is available
    if (app.uiManager) {
      app.uiManager.showError('A fatal error occurred during startup. The application cannot continue.');
    }
  });
});

},{"./components/credentials-manager.js":47,"./components/settings-manager.js":48,"./components/ui-manager.js":49,"./subsystems/advanced-realtime-subsystem.js":50,"./subsystems/auth-management-subsystem.js":51,"./subsystems/connection-manager-subsystem.js":52,"./subsystems/history-subsystem.js":53,"./subsystems/import-subsystem.js":54,"./subsystems/navigation-subsystem.js":55,"./subsystems/operation-manager-subsystem.js":56,"./subsystems/population-subsystem.js":57,"./subsystems/settings-subsystem.js":58,"./subsystems/view-management-subsystem.js":59,"./utils/event-bus.js":62,"./utils/local-api-client.js":64,"./utils/logger.js":65,"./utils/pingone-client.js":67,"@babel/runtime/helpers/interopRequireDefault":1}],47:[function(require,module,exports){
"use strict";

/**
 * Credentials Manager
 * Manages API credentials with localStorage persistence and .env fallback
 */
class CredentialsManager {
  constructor() {
    this.storageKey = 'pingone-credentials';
    this.defaultCredentials = this.getDefaultCredentials();
    this.credentials = null;
    this.init();
  }

  /**
   * Initialize the credentials manager
   */
  init() {
    this.loadCredentials();
    (window.logger?.info || console.log)('Credentials Manager initialized');
  }

  /**
   * Get default credentials from environment variables or empty values
   * @returns {Object} Default credentials object
   */
  getDefaultCredentials() {
    return {
      environmentId: '',
      apiClientId: '',
      apiSecret: '',
      region: 'NorthAmerica',
      populationId: ''
    };
  }

  /**
   * Load credentials from localStorage
   */
  loadCredentials() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.credentials = JSON.parse(stored);
        (window.logger?.debug || console.log)('Credentials loaded from localStorage');
      } else {
        this.credentials = this.getDefaultCredentials();
        (window.logger?.debug || console.log)('No stored credentials found, using defaults');
      }
    } catch (error) {
      (window.logger?.warn || console.warn)('Failed to load credentials from localStorage:', error);
      this.credentials = this.getDefaultCredentials();
    }
  }

  /**
   * Save credentials to localStorage
   * @param {Object} credentials - Credentials object to save
   */
  saveCredentials(credentials) {
    try {
      this.credentials = {
        ...this.credentials,
        ...credentials
      };
      localStorage.setItem(this.storageKey, JSON.stringify(this.credentials));
      (window.logger?.debug || console.log)('Credentials saved to localStorage');
    } catch (error) {
      (window.logger?.error || console.error)('Failed to save credentials to localStorage:', error);
    }
  }

  /**
   * Get current credentials
   * @returns {Object} Current credentials
   */
  getCredentials() {
    return {
      ...this.credentials
    };
  }

  /**
   * Update specific credential fields
   * @param {Object} updates - Credential fields to update
   */
  updateCredentials(updates) {
    this.credentials = {
      ...this.credentials,
      ...updates
    };
    this.saveCredentials(this.credentials);
  }

  /**
   * Clear all stored credentials
   */
  clearCredentials() {
    try {
      localStorage.removeItem(this.storageKey);
      this.credentials = this.getDefaultCredentials();
      (window.logger?.debug || console.log)('Credentials cleared');
    } catch (error) {
      (window.logger?.error || console.error)('Failed to clear credentials:', error);
    }
  }

  /**
   * Check if credentials are complete
   * @returns {boolean} True if all required fields are filled
   */
  hasCompleteCredentials() {
    return !!(this.credentials.environmentId && this.credentials.apiClientId && this.credentials.apiSecret);
  }

  /**
   * Get credentials for API calls with validation
   * @returns {Object|null} Valid credentials or null if incomplete
   */
  getValidCredentials() {
    if (!this.hasCompleteCredentials()) {
      return null;
    }
    return this.getCredentials();
  }

  /**
   * Validate credentials format
   * @param {Object} credentials - Credentials to validate
   * @returns {Object} Validation result
   */
  validateCredentials(credentials) {
    const errors = [];
    if (!credentials.environmentId) {
      errors.push('Environment ID is required');
    } else if (!this.isValidUUID(credentials.environmentId)) {
      errors.push('Environment ID must be a valid UUID');
    }
    if (!credentials.apiClientId) {
      errors.push('API Client ID is required');
    }
    if (!credentials.apiSecret) {
      errors.push('API Secret is required');
    }
    if (!credentials.region) {
      errors.push('Region is required');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if string is valid UUID
   * @param {string} uuid - String to validate
   * @returns {boolean} True if valid UUID
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Export credentials (for backup purposes)
   * @returns {string} JSON string of credentials
   */
  exportCredentials() {
    return JSON.stringify(this.credentials, null, 2);
  }

  /**
   * Import credentials from JSON string
   * @param {string} jsonString - JSON string of credentials
   * @returns {Object} Import result
   */
  importCredentials(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      const validation = this.validateCredentials(imported);
      if (validation.isValid) {
        this.saveCredentials(imported);
        return {
          success: true,
          message: 'Credentials imported successfully'
        };
      } else {
        return {
          success: false,
          errors: validation.errors
        };
      }
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format']
      };
    }
  }
}

// Export for use in other modules
window.CredentialsManager = CredentialsManager;

},{}],48:[function(require,module,exports){
(function (process){(function (){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _winstonLogger = require("../utils/winston-logger.js");
var _cryptoUtils = require("../utils/crypto-utils.js");
/**
 * @fileoverview Settings Manager Class
 * 
 * Manages application settings with secure storage and encryption.
 * Handles API credentials, user preferences, and configuration data
 * with automatic encryption for sensitive information.
 * 
 * @param {Object} logger - Winston logger instance for debugging
 */

class SettingsManager {
  /**
   * Create a new SettingsManager instance
   * @param {Object} logger - Winston logger instance for debugging
   */
  constructor() {
    let logger = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    // Initialize settings with default values
    this.settings = this.getDefaultSettings();
    this.storageKey = 'pingone-import-settings';
    this.encryptionKey = null;

    // Initialize Winston logger for debugging and error reporting
    this.initializeLogger(logger);

    // Encryption will be initialized in the init method
    this.encryptionInitialized = false;
  }

  /**
   * Initialize the settings manager
   * @returns {Promise<void>}
   */
  async init() {
    try {
      await this.initializeEncryption();
      this.encryptionInitialized = true;
      this.logger.info('Settings manager initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize settings manager', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize Winston logger
   * @param {Object} logger - Logger instance
   */
  initializeLogger(logger) {
    if (logger && typeof logger.child === 'function') {
      this.logger = logger.child({
        component: 'settings-manager'
      });
    } else {
      this.logger = (0, _winstonLogger.createWinstonLogger)({
        service: 'pingone-import-settings',
        environment: process.env.NODE_ENV || 'development'
      });
    }
  }

  /**
   * Create a default console logger if none provided
   * @returns {Object} Default logger object
   */
  createDefaultLogger() {
    var _this = this;
    return {
      log: function (msg) {
        let level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
        return _this.logger.log(level, `[Settings] ${msg}`);
      },
      info: msg => this.logger.info(`[Settings] ${msg}`),
      warn: msg => this.logger.warn(`[Settings] ${msg}`),
      error: msg => this.logger.error(`[Settings] ${msg}`),
      debug: msg => this.logger.debug(`[Settings] ${msg}`)
    };
  }

  /**
   * Get region info by code
   * @param {string} code - Region code (e.g., 'NA', 'CA', 'EU', 'AU', 'SG', 'AP')
   * @returns {{code: string, tld: string, label: string}} Region information
   */
  static getRegionInfo(code) {
    if (!code) {
      return {
        code: 'NA',
        tld: 'com',
        label: 'North America (excluding Canada)'
      };
    }
    const regions = {
      NA: {
        code: 'NA',
        tld: 'com',
        label: 'North America (excluding Canada)'
      },
      CA: {
        code: 'CA',
        tld: 'ca',
        label: 'Canada'
      },
      EU: {
        code: 'EU',
        tld: 'eu',
        label: 'European Union'
      },
      AU: {
        code: 'AU',
        tld: 'com.au',
        label: 'Australia'
      },
      SG: {
        code: 'SG',
        tld: 'sg',
        label: 'Singapore'
      },
      AP: {
        code: 'AP',
        tld: 'asia',
        label: 'Asia-Pacific'
      }
    };
    return regions[code] || regions['NA'];
  }

  /**
   * Get default settings
   * @returns {Object} Default settings object
   */
  getDefaultSettings() {
    return {
      environmentId: '',
      region: 'NA',
      apiClientId: '',
      populationId: '',
      rateLimit: 50,
      connectionStatus: 'disconnected',
      connectionMessage: 'Not connected',
      lastConnectionTest: null,
      autoSave: true,
      lastUsedDirectory: '',
      theme: 'light',
      pageSize: 50,
      showNotifications: true
    };
  }

  /**
   * Load settings from storage
   * @returns {Promise<Object>} Loaded settings
   */
  async loadSettings() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        this.logger.info('No stored settings found, using defaults');
        return this.settings;
      }

      // Try to parse as JSON first (unencrypted)
      try {
        const parsedSettings = JSON.parse(storedData);
        this.settings = {
          ...this.getDefaultSettings(),
          ...parsedSettings
        };
        this.logger.info('Settings loaded successfully (unencrypted)', {
          hasEnvironmentId: !!this.settings.environmentId,
          hasApiClientId: !!this.settings.apiClientId,
          region: this.settings.region
        });
        return this.settings;
      } catch (jsonError) {
        // If JSON parsing fails, try decryption
        if (!this.encryptionInitialized) {
          this.logger.warn('Encryption not initialized and JSON parsing failed, using defaults');
          return this.settings;
        }
        try {
          const decryptedData = await _cryptoUtils.CryptoUtils.decrypt(storedData, this.encryptionKey);
          const parsedSettings = JSON.parse(decryptedData);

          // Merge with defaults to ensure all properties exist
          this.settings = {
            ...this.getDefaultSettings(),
            ...parsedSettings
          };
          this.logger.info('Settings loaded successfully (encrypted)', {
            hasEnvironmentId: !!this.settings.environmentId,
            hasApiClientId: !!this.settings.apiClientId,
            region: this.settings.region
          });
          return this.settings;
        } catch (decryptionError) {
          this.logger.error('Failed to decrypt settings', {
            error: decryptionError.message
          });
          // Return default settings on decryption error
          return this.settings;
        }
      }
    } catch (error) {
      this.logger.error('Failed to load settings', {
        error: error.message
      });
      // Return default settings on error
      return this.settings;
    }
  }

  /**
   * Save settings to storage
   * @param {Object} settings - Settings to save (optional)
   * @returns {Promise<void>}
   */
  async saveSettings() {
    let settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    try {
      if (settings) {
        this.settings = {
          ...this.settings,
          ...settings
        };
      }

      // Always try to save without encryption first as fallback
      const jsonData = JSON.stringify(this.settings);
      if (!this.encryptionInitialized) {
        this.logger.warn('Encryption not initialized, saving settings without encryption');
        localStorage.setItem(this.storageKey, jsonData);
        this.logger.info('Settings saved successfully (unencrypted)', {
          hasEnvironmentId: !!this.settings.environmentId,
          hasApiClientId: !!this.settings.apiClientId,
          region: this.settings.region
        });
        return;
      }
      try {
        const encryptedData = await _cryptoUtils.CryptoUtils.encrypt(jsonData, this.encryptionKey);
        localStorage.setItem(this.storageKey, encryptedData);
        this.logger.info('Settings saved successfully (encrypted)', {
          hasEnvironmentId: !!this.settings.environmentId,
          hasApiClientId: !!this.settings.apiClientId,
          region: this.settings.region
        });
      } catch (encryptionError) {
        this.logger.warn('Encryption failed, saving settings without encryption', {
          error: encryptionError.message
        });
        // Fallback to unencrypted storage
        localStorage.setItem(this.storageKey, jsonData);
        this.logger.info('Settings saved successfully (unencrypted fallback)', {
          hasEnvironmentId: !!this.settings.environmentId,
          hasApiClientId: !!this.settings.apiClientId,
          region: this.settings.region
        });
      }
    } catch (error) {
      this.logger.error('Failed to save settings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get a specific setting
   * @param {string} key - Setting key
   * @returns {*} Setting value
   */
  getSetting(key) {
    if (!key) {
      throw new Error('Setting key is required');
    }
    return this.settings[key];
  }

  /**
   * Set a specific setting
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    if (!key) {
      throw new Error('Setting key is required');
    }
    try {
      this.settings[key] = value;
      await this.saveSettings();
      this.logger.debug('Setting updated', {
        key,
        value: typeof value === 'string' ? value : '[object]'
      });
    } catch (error) {
      this.logger.error('Failed to update setting', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get all settings
   * @returns {Object} All settings
   */
  getAllSettings() {
    return {
      ...this.settings
    };
  }

  /**
   * Get settings (alias for getAllSettings for compatibility)
   * @returns {Object} All settings
   */
  getSettings() {
    return this.getAllSettings();
  }

  /**
   * Update multiple settings at once
   * @param {Object} newSettings - New settings to update
   * @returns {Promise<void>}
   */
  async updateSettings(newSettings) {
    if (!newSettings || typeof newSettings !== 'object') {
      throw new Error('New settings object is required');
    }
    try {
      this.settings = {
        ...this.settings,
        ...newSettings
      };
      await this.saveSettings();
      this.logger.info('Multiple settings updated', {
        updatedKeys: Object.keys(newSettings),
        hasEnvironmentId: !!this.settings.environmentId,
        hasApiClientId: !!this.settings.apiClientId
      });
    } catch (error) {
      this.logger.error('Failed to update settings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   * @returns {Promise<void>}
   */
  async resetSettings() {
    try {
      this.settings = this.getDefaultSettings();
      await this.saveSettings();
      this.logger.info('Settings reset to defaults');
    } catch (error) {
      this.logger.error('Failed to reset settings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Clear all settings
   * @returns {Promise<void>}
   */
  async clearSettings() {
    try {
      localStorage.removeItem(this.storageKey);
      this.settings = this.getDefaultSettings();
      this.logger.info('Settings cleared');
    } catch (error) {
      this.logger.error('Failed to clear settings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize encryption with a key derived from browser and user-specific data
   * @returns {Promise<void>}
   */
  async initializeEncryption() {
    try {
      let deviceId = await this.getDeviceId();
      if (typeof deviceId !== 'string') deviceId = String(deviceId || '');
      if (!deviceId) deviceId = 'fallback-device-id';
      this.encryptionKey = await _cryptoUtils.CryptoUtils.generateKey(deviceId);
      this.logger.debug('Encryption initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize encryption', {
        error: error.message
      });
      // Fallback to a less secure but functional approach
      this.encryptionKey = await _cryptoUtils.CryptoUtils.generateKey('fallback-encryption-key');
      this.logger.warn('Using fallback encryption key');
    }
  }

  /**
   * Generate a device ID based on browser and system information
   * @returns {Promise<string>} A unique device ID
   */
  async getDeviceId() {
    try {
      // Try to get a stored device ID first
      if (this.isLocalStorageAvailable()) {
        const storedDeviceId = localStorage.getItem('pingone-device-id');
        if (storedDeviceId && typeof storedDeviceId === 'string') {
          return storedDeviceId;
        }
      }

      // Generate device ID from browser info
      const navigatorInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: navigator.deviceMemory,
        maxTouchPoints: navigator.maxTouchPoints
      };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(navigatorInfo));
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      if (typeof deviceId !== 'string' || !deviceId) {
        return 'fallback-device-id';
      }
      return deviceId;
    } catch (error) {
      this.logger.error('Failed to generate device ID:', error);
      // Fallback to a random string if crypto API fails
      return 'fallback-' + Math.random().toString(36).substring(2, 15);
    }
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} True if localStorage is available
   */
  isLocalStorageAvailable() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      this.logger.warn('localStorage not available', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Export settings (for backup)
   * @returns {Promise<Object>} Export data
   */
  async exportSettings() {
    try {
      const exportData = {
        settings: this.settings,
        exportDate: new Date().toISOString(),
        version: '1.0'
      };
      this.logger.info('Settings exported', {
        exportDate: exportData.exportDate
      });
      return exportData;
    } catch (error) {
      this.logger.error('Failed to export settings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Import settings (from backup)
   * @param {Object} importData - Import data object
   * @returns {Promise<void>}
   */
  async importSettings(importData) {
    if (!importData) {
      throw new Error('Import data is required');
    }
    if (!importData.settings) {
      throw new Error('Invalid import data: missing settings');
    }
    try {
      this.settings = {
        ...this.getDefaultSettings(),
        ...importData.settings
      };
      await this.saveSettings();
      this.logger.info('Settings imported successfully', {
        importDate: importData.exportDate,
        hasEnvironmentId: !!this.settings.environmentId,
        hasApiClientId: !!this.settings.apiClientId
      });
    } catch (error) {
      this.logger.error('Failed to import settings', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Debug method to check localStorage contents
   * @returns {Object|null} Debug information
   */
  debugLocalStorage() {
    try {
      const storedData = localStorage.getItem(this.storageKey);
      if (!storedData) {
        this.logger.info('No data found in localStorage', {
          key: this.storageKey
        });
        return null;
      }
      this.logger.info('localStorage contents found', {
        key: this.storageKey,
        length: storedData.length,
        preview: storedData.substring(0, 100) + (storedData.length > 100 ? '...' : '')
      });

      // Try to parse as JSON
      try {
        const parsed = JSON.parse(storedData);
        this.logger.info('Data is valid JSON', {
          keys: Object.keys(parsed),
          hasEnvironmentId: !!parsed.environmentId,
          hasApiClientId: !!parsed.apiClientId
        });
        return parsed;
      } catch (jsonError) {
        this.logger.info('Data is not valid JSON, likely encrypted', {
          error: jsonError.message
        });
        return 'encrypted';
      }
    } catch (error) {
      this.logger.error('Failed to debug localStorage', {
        error: error.message
      });
      return null;
    }
  }
}

// Export the SettingsManager class as default
var _default = exports.default = SettingsManager;

}).call(this)}).call(this,require('_process'))
},{"../utils/crypto-utils.js":61,"../utils/winston-logger.js":68,"_process":37}],49:[function(require,module,exports){
(function (process){(function (){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.UIManager = void 0;
var _circularProgress = require("../../../public/js/modules/circular-progress.js");
var _elementRegistry = require("../../../public/js/modules/element-registry.js");
var _progressManager = _interopRequireDefault(require("../../../public/js/modules/progress-manager.js"));
var _errorTypes = require("../../../public/js/modules/error/error-types.js");
var _safeDom = require("../../../public/js/modules/utils/safe-dom.js");
// File: ui-manager.js
// Description: UI management for PingOne user import tool
// 
// This module handles all user interface interactions and state management:
// - Status notifications and user feedback
// - Progress tracking and real-time updates
// - View transitions and navigation
// - Debug logging and error display
// - Connection status indicators
// - Form handling and validation feedback
// 
// Provides a centralized interface for updating the UI based on application events.

// Enable debug mode for development (set to false in production)
const DEBUG_MODE = process.env.NODE_ENV === 'development';

/**
 * UI Manager Class
 * 
 * Manages all user interface interactions and updates with centralized error handling.
 */
class UIManager {
  /**
   * Create a new UIManager instance
   * @param {Object} options - Configuration options
   * @param {Object} options.errorManager - Error manager instance
   * @param {Object} options.logger - Logger instance
   */
  constructor() {
    let {
      errorManager,
      logger
    } = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    // Initialize logger from provided logger or fallback to console
    this.logger = logger ? logger.child({
      component: 'UIManager'
    }) : console;

    // Initialize error manager
    this.errorManager = errorManager || {
      handleError: (error, context) => {
        (window.logger?.error || console.error)('Unhandled error (no error manager):', error, context);
      }
    };

    // Initialize UI elements
    this.notificationContainer = null;
    this.progressContainer = null;
    this.tokenStatusElement = null;
    this.connectionStatusElement = null;

    // Initialize the UI manager
    this.initialize();
  }

  /**
   * Initialize UI manager and setup core functionality
   */
  /**
   * Initialize the UI Manager
   * @private
   */
  initialize() {
    try {
      this.setupElements();
      this.logger.info('UI Manager initialized successfully');
    } catch (error) {
      this.errorManager.handleError(error, {
        component: 'UIManager',
        operation: 'initialize',
        severity: 'error',
        context: {
          message: 'Failed to initialize UI Manager',
          error: error.message
        }
      });
    }
  }

  /**
   * Setup UI components and initialize interface elements
   * This method is called during application initialization
   */
  setupUI() {
    try {
      this.logger.debug('Setting up UI components...');

      // Initialize core UI elements
      this.setupElements();

      // Setup event listeners for UI interactions
      this.setupEventListeners();

      // Initialize status indicators
      this.initializeStatusIndicators();

      // Setup progress tracking
      this.initializeProgressTracking();
      this.logger.info('UI setup completed successfully');
    } catch (error) {
      this.logger.error('Error during UI setup:', error);
      this.errorManager.handleError(error, {
        component: 'UIManager',
        operation: 'setupUI',
        severity: 'error',
        context: {
          message: 'Failed to setup UI components',
          error: error.message
        }
      });
    }
  }

  /**
   * Setup event listeners for UI interactions
   * @private
   */
  setupEventListeners() {
    try {
      // Setup global error handling
      window.addEventListener('error', event => {
        this.handleGlobalError(event.error, {
          type: 'global_error',
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      // Setup unhandled promise rejection handling
      window.addEventListener('unhandledrejection', event => {
        this.handleGlobalError(event.reason, {
          type: 'unhandled_promise_rejection'
        });
      });
      this.logger.debug('Event listeners setup completed');
    } catch (error) {
      this.logger.error('Error setting up event listeners:', error);
    }
  }

  /**
   * Initialize status indicators
   * @private
   */
  initializeStatusIndicators() {
    try {
      // Initialize token status
      if (this.tokenStatusElement) {
        this.updateTokenStatus('checking', 'Checking token status...');
      }

      // Initialize connection status
      if (this.connectionStatusElement) {
        this.updateConnectionStatus('connecting', 'Connecting...');
      }
      this.logger.debug('Status indicators initialized');
    } catch (error) {
      this.logger.error('Error initializing status indicators:', error);
    }
  }

  /**
   * Initialize progress tracking components
   * @private
   */
  initializeProgressTracking() {
    try {
      // Hide progress initially
      if (this.progressContainer) {
        this.hideProgress();
      }
      this.logger.debug('Progress tracking initialized');
    } catch (error) {
      this.logger.error('Error initializing progress tracking:', error);
    }
  }

  /**
   * Handle global errors
   * @private
   */
  handleGlobalError(error) {
    let context = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    try {
      this.logger.error('Global error caught:', {
        error: error.message,
        context
      });
      if (this.errorManager && typeof this.errorManager.handleError === 'function') {
        this.errorManager.handleError(error, {
          component: 'UIManager',
          operation: 'global_error_handler',
          severity: 'error',
          context
        });
      }
    } catch (handlerError) {
      console.error('Error in global error handler:', handlerError);
    }
  }

  /**
   * Initialize UI manager (alias for initialize for compatibility)
   * @returns {Promise<void>} Promise that resolves when initialization is complete
   */
  async init() {
    this.initialize();
    return Promise.resolve();
  }

  /**
   * Setup UI elements and initialize core DOM references
   */
  setupElements() {
    try {
      // Initialize core UI elements with safe fallbacks
      this.notificationContainer = _elementRegistry.ElementRegistry.notificationContainer ? _elementRegistry.ElementRegistry.notificationContainer() : null;
      this.progressContainer = _elementRegistry.ElementRegistry.progressContainer ? _elementRegistry.ElementRegistry.progressContainer() : null;
      this.tokenStatusElement = _elementRegistry.ElementRegistry.tokenStatus ? _elementRegistry.ElementRegistry.tokenStatus() : null;
      this.connectionStatusElement = _elementRegistry.ElementRegistry.connectionStatus ? _elementRegistry.ElementRegistry.connectionStatus() : null;

      // Initialize navigation items for safe access
      this.navItems = document.querySelectorAll('[data-view]');
      if (!this.notificationContainer) {
        this.logger.warn('Notification container not found');
      }
      if (!this.progressContainer) {
        this.logger.warn('Progress container not found');
      }
      this.logger.debug('UI elements setup completed', {
        hasNotificationContainer: !!this.notificationContainer,
        hasProgressContainer: !!this.progressContainer,
        hasTokenStatusElement: !!this.tokenStatusElement,
        hasConnectionStatusElement: !!this.connectionStatusElement,
        navItemsCount: this.navItems ? this.navItems.length : 0
      });
    } catch (error) {
      this.logger.error('Error setting up UI elements', {
        error: error.message
      });
    }
  }

  /**
   * Show a status message in the status bar
   * @param {string} message - The message to display
   * @param {string} [type='info'] - Message type (info, success, warning, error)
   * @param {Object} [options] - Additional options
   * @param {number} [options.duration=5000] - Duration in milliseconds to show the message
   * @param {boolean} [options.autoDismiss=true] - Whether to auto-dismiss the message
   * @param {string} [options.errorId] - Unique error ID for tracking
   * @param {Object} [options.context] - Additional context for the message
   */
  /**
   * Show a status message in the status bar
   * @param {string} message - The message to display
   * @param {string} [type='info'] - Message type (info, success, warning, error)
   * @param {Object} [options] - Additional options
   * @param {number} [options.duration=5000] - Duration in milliseconds to show the message
   * @param {boolean} [options.autoDismiss=true] - Whether to auto-dismiss the message
   * @param {string} [options.errorId] - Unique error ID for tracking
   * @param {Object} [options.context] - Additional context for the message
   */
  showStatusBar(message) {
    let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const {
      duration = 5000,
      autoDismiss = true,
      errorId,
      context = {}
    } = options;
    try {
      // Log the status message with appropriate level
      const logLevel = {
        info: 'info',
        success: 'info',
        warning: 'warn',
        error: 'error'
      }[type] || 'log';

      // Create log context
      const logContext = {
        messageType: type,
        ...(errorId && {
          errorId
        }),
        ...context
      };

      // Log the message with context
      this.logger[logLevel](`Status: ${message}`, logContext);

      // If status bar element is not available, just log and return
      if (!this.statusBarElement) {
        this.logger.debug('Status bar element not available in current view', logContext);
        return;
      }

      // Clear any existing timers
      if (this.statusBarTimer) {
        clearTimeout(this.statusBarTimer);
        this.statusBarTimer = null;
      }

      // Clear existing content using Safe DOM
      const safeDOM = window.safeDOM || new _safeDom.SafeDOM(this.logger);
      const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
      const UI_CONFIG = window.UI_CONFIG || {
        CLASSES: {
          ERROR: 'error',
          SUCCESS: 'success'
        }
      };
      safeDOM.setHTML(this.statusBarElement, '');

      // Create message element using Safe DOM
      const msg = document.createElement('span');
      safeDOM.addClass(msg, 'status-message');

      // Add error ID to the message if available
      let displayMessage = message;
      if (type === UI_CONFIG.CLASSES.ERROR && errorId) {
        displayMessage += ` (Error ID: ${errorId})`;

        // In development, show more context for errors
        if (process.env.NODE_ENV === 'development' && Object.keys(context).length > 0) {
          displayMessage += `\n${JSON.stringify(context, null, 2)}`;
        }
      }
      safeDOM.setText(msg, displayMessage);
      this.statusBarElement.appendChild(msg);

      // Add dismiss button for error/warning (persistent messages)
      if (type === UI_CONFIG.CLASSES.ERROR || type === 'warning') {
        const dismiss = document.createElement('button');
        safeDOM.addClass(dismiss, 'status-dismiss');
        safeDOM.setHTML(dismiss, '&times;');
        dismiss.setAttribute('aria-label', 'Dismiss message');

        // Use error handler to wrap the event handler
        dismiss.onclick = errorHandler.wrapEventHandler(() => this.clearStatusBar(), 'Status bar dismiss button click');
        this.statusBarElement.appendChild(dismiss);
      }

      // Set status bar classes
      this.statusBarElement.className = `status-bar status-bar-${type} visible`;

      // Auto-dismiss for success/info messages or if explicitly enabled
      const shouldAutoDismiss = autoDismiss && (type === 'success' || type === 'info');
      if (shouldAutoDismiss) {
        this.statusBarTimer = setTimeout(() => {
          this.clearStatusBar();
        }, duration);
      }
    } catch (error) {
      // If there's an error showing the status bar, report it but don't crash
      this.errorManager.handleError(error, {
        component: 'UIManager',
        operation: 'showStatusBar',
        severity: 'warning',
        context: {
          originalMessage: message,
          type,
          options,
          errorMessage: error.message
        }
      });

      // Fallback to console if the error manager fails
      (window.logger?.error || console.error)('Failed to show status bar:', error);
      (window.logger?.debug || console.log)('Original message:', message);

      // Try to show a simplified error message
      try {
        if (this.statusBarElement) {
          this.statusBarElement.textContent = `Error: ${message.substring(0, 100)}`;
          this.statusBarElement.className = 'status-bar status-bar-error visible';
        }
      } catch (e) {
        // If we can't even show the error message, just give up
        (window.logger?.error || console.error)('Completely failed to show status bar:', e);
      }
    }
  }

  /**
   * Clear the status bar with smooth animation
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.force=false] - Force clear without animation
   */
  clearStatusBar() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    try {
      // Clear any pending auto-dismiss timers
      if (this.statusBarTimer) {
        clearTimeout(this.statusBarTimer);
        this.statusBarTimer = null;
      }

      // If status bar element doesn't exist, just return
      if (!this.statusBarElement) {
        this.logger.debug('Status bar element not found during clear');
        return;
      }
      const {
        force = false
      } = options;
      const safeDOM = window.safeDOM || new _safeDom.SafeDOM(this.logger);
      const UI_CONFIG = window.UI_CONFIG || {
        TIMEOUTS: {
          ANIMATION: 300
        }
      };
      if (force) {
        // Immediate removal using Safe DOM
        safeDOM.setHTML(this.statusBarElement, '');
        this.statusBarElement.className = 'status-bar';
        this.logger.debug('Status bar cleared immediately');
      } else {
        // Animate out using Safe DOM
        safeDOM.removeClass(this.statusBarElement, 'visible');

        // Remove the element after animation completes
        setTimeout(() => {
          if (this.statusBarElement) {
            safeDOM.setHTML(this.statusBarElement, '');
            this.statusBarElement.className = 'status-bar';
          }
        }, UI_CONFIG.TIMEOUTS?.ANIMATION || 300); // Use config constant for timeout

        this.logger.debug('Status bar cleared with animation');
      }
    } catch (error) {
      this.errorManager.handleError(error, {
        component: 'UIManager',
        operation: 'clearStatusBar',
        severity: 'warning',
        context: {
          options,
          errorMessage: error.message
        }
      });

      // Fallback to direct DOM manipulation if possible
      try {
        if (this.statusBarElement) {
          this.statusBarElement.innerHTML = '';
          this.statusBarElement.className = 'status-bar';
        }
      } catch (e) {
        (window.logger?.error || console.error)('Failed to clear status bar:', e);
      }
    }
  }

  /**
   * Show a success message
   * @param {string} message - The success message to display
   * @param {Object} [details] - Additional details to log
   */
  showSuccess(message) {
    let details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.showStatusBar(message, 'success');
    this.logger.info('Success message shown', {
      message,
      ...details
    });
  }

  /**
   * Show a warning message
   * @param {string} message - The warning message to display
   * @param {Object} [details] - Additional details to log
   */
  showWarning(message) {
    let details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.showStatusBar(message, 'warning');
    this.logger.warn('Warning message shown', {
      message,
      ...details
    });
  }

  /**
   * Show an info message
   * @param {string} message - The info message to display
   * @param {Object} [details] - Additional details to log
   */
  showInfo(message) {
    let details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.showStatusBar(message, 'info');
  }
  /**
   * Show an error message to the user
   * @param {string|Error} error - Error title, message, or Error object
   * @param {string|Object} [details] - Additional error details or options object
   * @param {Object} [options] - Additional options
   * @param {string} [options.errorId] - Unique error ID for tracking
   * @param {Object} [options.context] - Additional context for the error
   * @param {boolean} [options.reportToServer=true] - Whether to report the error to the server
   * @param {string} [options.operation] - The operation that failed
   * @param {string} [options.component] - The component where the error occurred
   */
  showError(error) {
    let details = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    // Handle different parameter patterns
    let errorMessage, errorObj, errorContext;
    if (error instanceof Error) {
      // First parameter is an Error object
      errorObj = error;
      errorMessage = error.message;
      errorContext = typeof details === 'object' && details !== null ? details : {};
    } else if (typeof error === 'string' && details instanceof Error) {
      // First is title, second is Error object
      errorObj = details;
      errorMessage = `${error}: ${details.message}`;
      errorContext = {};
    } else if (typeof error === 'string' && typeof details === 'string') {
      // Both are strings (title and message)
      errorMessage = `${error}: ${details}`;
      errorObj = new Error(errorMessage);
      errorObj.name = error;
      errorContext = {};
    } else if (typeof error === 'string') {
      // First is message, second is options
      errorMessage = error;
      errorObj = new Error(errorMessage);
      errorContext = typeof details === 'object' && details !== null ? details : {};
    } else {
      // Invalid parameters
      const invalidError = new Error('Invalid parameters passed to showError');
      this.errorManager.handleError(invalidError, {
        component: 'UIManager',
        operation: 'showError',
        severity: 'error',
        context: {
          error,
          details,
          options
        }
      });
      return;
    }

    // Merge contexts
    const mergedContext = {
      ...errorContext,
      ...options.context
    };

    // Report the error through the error manager
    if (options.reportToServer !== false) {
      this.errorManager.handleError(errorObj, {
        component: options.component || 'UIManager',
        operation: options.operation || 'showError',
        severity: 'error',
        context: mergedContext
      });
    }

    // Show the error in the UI
    this.showStatusBar(errorMessage, 'error', {
      autoDismiss: false,
      errorId: options.errorId,
      context: mergedContext,
      ...options
    });

    // Log the error with additional context
    this.logger.error('Error message shown', {
      error: errorMessage,
      name: errorObj.name,
      stack: errorObj.stack,
      ...mergedContext
    });
  }
  catch(error) {
    // If there's an error in the error handler, log to console
    (window.logger?.error || console.error)('Error in showError:', error);

    // Try to show a basic error message
    try {
      const fallbackMessage = 'An error occurred';
      this.showStatusBar(fallbackMessage, 'error', {
        autoDismiss: false,
        context: {
          originalError: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        }
      });
    } catch (e) {
      // If we can't even show the error message, just give up
      (window.logger?.error || console.error)('Completely failed to show error:', e);
    }
  }

  /**
   * Hide loading indicator dand optionally show success message
   * @param {string} successMessage - Optional success message to show after hiding loading
   */
  hideLoading() {
    let successMessage = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    this.clearStatusBar();
    if (successMessage) {
      this.showSuccess(successMessage);
    }
    this.logger.debug('Loading indicator hidden');
  }

  /**
   * Update progress bar with current and total values
   * @param {number} current - Current progress value
   * @param {number} total - Total progress value
   * @param {string} message - Progress message
   */
  updateProgress(current, total) {
    let message = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] updateProgress() called with:', {
      current,
      total,
      message
    });
    if (!this.progressContainer) {
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Progress container not found in updateProgress');
      this.logger.warn('Progress container not found');
      return;
    }
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container found, calculating percentage...');
    const percentage = total > 0 ? Math.round(current / total * 100) : 0;
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Calculated percentage:', percentage);

    // Initialize utilities for safe DOM operations
    const safeDOM = window.safeDOM || new _safeDom.SafeDOM(this.logger);
    const UI_CONFIG = window.UI_CONFIG || {
      SELECTORS: {
        PROGRESS_BAR_FILL: '.progress-bar-fill',
        PROGRESS_PERCENTAGE: '.progress-percentage',
        PROGRESS_TEXT: '.progress-text'
      }
    };

    // Update progress bar using Safe DOM
    const progressBar = safeDOM.select(UI_CONFIG.SELECTORS.PROGRESS_BAR_FILL, this.progressContainer);
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress bar element:', progressBar);
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress bar updated to:', `${percentage}%`);
    } else {
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Progress bar element not found');
    }

    // Update percentage text using Safe DOM
    const percentageElement = safeDOM.select(UI_CONFIG.SELECTORS.PROGRESS_PERCENTAGE, this.progressContainer);
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Percentage element:', percentageElement);
    if (percentageElement) {
      safeDOM.setText(percentageElement, `${percentage}%`);
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Percentage text updated to:', `${percentage}%`);
    } else {
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Percentage element not found');
    }

    // Update progress text using Safe DOM
    const progressText = safeDOM.select(UI_CONFIG.SELECTORS.PROGRESS_TEXT, this.progressContainer);
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text element:', progressText);
    if (progressText && message) {
      safeDOM.setText(progressText, message);
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress text updated to:', message);
    } else {
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Progress text element not found or no message');
    }
    this.logger.debug('Progress updated', {
      current,
      total,
      percentage,
      message
    });
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] updateProgress() completed');
  }

  /**
   * Update token status display
   * @param {string} status - Token status (valid, expired, etc.)
   * @param {string} message - Status message
   */
  updateTokenStatus(status) {
    let message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    if (!this.tokenStatusElement) {
      this.logger.warn('Token status element not found');
      return;
    }
    this.tokenStatusElement.className = `token-status ${status}`;
    this.tokenStatusElement.textContent = message || status;
    this.logger.debug('Token status updated', {
      status,
      message
    });
  }

  /**
   * Update connection status display
   * @param {string} status - Connection status (connected, disconnected, etc.)
   * @param {string} message - Status message
   */
  updateConnectionStatus(status) {
    let message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    if (!this.connectionStatusElement) {
      this.logger.warn('Connection status element not found');
      return;
    }
    this.connectionStatusElement.className = `connection-status ${status}`;
    this.connectionStatusElement.textContent = message || status;
    this.logger.debug('Connection status updated', {
      status,
      message
    });
  }

  /**
   * Show current token status with detailed information
   * @param {Object} tokenInfo - Token information object
   */
  showCurrentTokenStatus(tokenInfo) {
    if (!tokenInfo) {
      this.logger.warn('No token info provided');
      return;
    }
    const {
      isValid,
      expiresAt,
      timeRemaining
    } = tokenInfo;
    if (!isValid) {
      this.updateTokenStatus('expired', '');
      return;
    }
    const timeRemainingText = timeRemaining ? ` (${timeRemaining})` : '';
    this.updateTokenStatus('valid', `Token valid${timeRemainingText}`);
    this.logger.info('Current token status displayed', {
      isValid,
      expiresAt,
      timeRemaining
    });
  }

  /**
   * Update universal token status bar
   * @param {Object} tokenInfo - Token information object
   */
  updateUniversalTokenStatus(tokenInfo) {
    // Redirect to token-status-indicator instead of universal-token-status
    const tokenStatusBar = document.getElementById('token-status-indicator');
    if (!tokenStatusBar) {
      this.logger.warn('Token status indicator not found');
      return;
    }
    if (!tokenInfo) {
      tokenStatusBar.style.display = 'none';
      return;
    }
    const {
      isValid,
      expiresAt,
      timeRemaining
    } = tokenInfo;
    const statusContent = tokenStatusBar.querySelector('.token-status-content');
    if (statusContent) {
      const icon = statusContent.querySelector('.token-status-icon');
      const text = statusContent.querySelector('.token-status-text');
      const time = statusContent.querySelector('.token-status-time');
      if (isValid) {
        icon.textContent = '✅';
        text.textContent = 'Token valid';
        time.textContent = timeRemaining || '';
      } else {
        icon.textContent = '❌';
        text.textContent = '';
        text.style.visibility = 'hidden';
        time.textContent = '';
      }
    }
    tokenStatusBar.style.display = 'block';
    this.logger.debug('Token status indicator updated', {
      isValid,
      timeRemaining
    });
  }

  /**
   * Update home page token status
   * @param {boolean} isLoading - Whether to show loading state
   * @param {string} message - Status message
   */
  updateHomeTokenStatus() {
    let isLoading = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    let message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    const homeTokenStatus = document.getElementById('home-token-status');
    if (!homeTokenStatus) {
      (window.logger?.error || console.log)('❌ home-token-status element not found!');
      return;
    }
    (window.logger?.debug || console.log)('✅ Found home-token-status element:', homeTokenStatus);

    // Check current token status to determine button color
    let hasValidToken = false;
    let buttonClass = 'btn-danger'; // Default to red
    let buttonText = 'Get New Token';
    try {
      // First check for stashed token in localStorage
      hasValidToken = this.checkForStashedToken();

      // If no stashed token, check PingOne client
      if (!hasValidToken && window.app && window.app.pingOneClient) {
        const tokenInfo = window.app.pingOneClient.getCurrentTokenTimeRemaining();
        if (tokenInfo && tokenInfo.token && !tokenInfo.isExpired) {
          hasValidToken = true;
        }
      }

      // Set button appearance based on token status
      if (hasValidToken) {
        buttonClass = 'btn-success'; // Green when token is valid
        buttonText = 'Token Valid';
      }
    } catch (error) {
      (window.logger?.error || console.log)('Error checking token status:', error);
    }

    // Move to bottom of sidebar
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && homeTokenStatus.parentNode !== sidebar) {
      sidebar.appendChild(homeTokenStatus);
      (window.logger?.debug || console.log)('✅ Moved home-token-status to bottom of sidebar');
    }

    // Add debug label to home-token-status container (red, above box)
    if (!document.getElementById('debug-home-token-status-label')) {
      const debugLabel = document.createElement('div');
      debugLabel.id = 'debug-home-token-status-label';
      debugLabel.style.cssText = `
                position: absolute !important;
                top: -30px !important;
                left: 0 !important;
                background: #ff0000 !important;
                color: #ffffff !important;
                padding: 4px 8px !important;
                font-size: 12px !important;
                font-weight: bold !important;
                border: 2px solid #000 !important;
                z-index: 9999 !important;
                white-space: nowrap !important;
                pointer-events: none !important;
            `;
      debugLabel.textContent = 'DEBUG: home-token-status CONTAINER';

      // Ensure container has relative positioning
      homeTokenStatus.style.cssText = `
                position: relative !important;
                background: #ffffcc !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 6px !important;
                padding: 2px !important;
                width: fit-content !important;
                height: auto !important;
                display: block !important;
                overflow: visible !important;
                margin-top: auto !important;
            `;
      homeTokenStatus.appendChild(debugLabel);
      (window.logger?.debug || console.log)('✅ Added debug label to home-token-status container');
    }
    if (isLoading) {
      homeTokenStatus.innerHTML = '';
    } else {
      // Use the provided token-status-indicator markup with dynamic button color and enhanced styling
      homeTokenStatus.innerHTML = `
                <div id="token-status-indicator" class="token-status-indicator valid" role="status" aria-live="polite" style="display: block !important; padding: 0 !important; margin: 0 !important; background: none !important; border: none !important;">
                    <button id="get-token-btn" class="btn ${buttonClass}" style="font-size: 14px !important; padding: 8px 16px !important; margin: 0 !important; font-weight: 500 !important; border-radius: 6px !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; transition: all 0.2s ease !important;">
                        <i class="fas fa-key"></i> ${buttonText}
                    </button>
                </div>
            `;
      // Wire up the button to call getNewToken if available
      const getTokenBtn = document.getElementById('get-token-btn');
      if (getTokenBtn) {
        getTokenBtn.addEventListener('click', () => {
          if (window.tokenStatusIndicator && typeof window.tokenStatusIndicator.getNewToken === 'function') {
            window.tokenStatusIndicator.getNewToken();
          } else if (typeof this.getNewToken === 'function') {
            this.getNewToken();
          } else {
            // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
            // alert('Get New Token functionality is not available.');
          }
        });
      }
    }
    homeTokenStatus.style.display = 'block';
    this.logger.debug('Home token status updated', {
      isLoading,
      message,
      hasValidToken,
      buttonClass
    });
  }

  /**
   * Check for stashed token in localStorage
   * @returns {boolean} True if valid token is found
   */
  checkForStashedToken() {
    try {
      if (typeof localStorage === 'undefined') {
        return false;
      }
      const token = localStorage.getItem('pingone_worker_token');
      const expiry = localStorage.getItem('pingone_token_expiry');
      if (!token || !expiry) {
        return false;
      }
      const expiryTime = parseInt(expiry, 10);
      const now = Date.now();

      // Check if token is expired (with 5 minute buffer)
      if (isNaN(expiryTime) || now >= expiryTime - 5 * 60 * 1000) {
        return false;
      }
      return true;
    } catch (error) {
      (window.logger?.error || console.error)('Error checking for stashed token:', error);
      return false;
    }
  }

  /**
   * Update settings save status with message and type
   * @param {string} message - Status message
   * @param {string} type - Message type (success, error, warning, info)
   */
  updateSettingsSaveStatus(message) {
    let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    const settingsStatus = document.querySelector('.settings-save-status');
    if (!settingsStatus) {
      this.logger.warn('Settings save status element not found');
      return;
    }

    // Update classes
    settingsStatus.className = `settings-save-status ${type} show`;

    // Create simple HTML structure with text on the left, icon on the right
    const iconClass = this.getStatusIcon(type);
    settingsStatus.innerHTML = `
            <span>${message}</span>
            <i class="fas ${iconClass}"></i>
        `;

    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        settingsStatus.classList.remove('show');
      }, 3000);
    }
    this.logger.info('Settings save status updated', {
      message,
      type
    });
  }

  /**
   * Show settings action status with enhanced options
   * @param {string} message - Status message
   * @param {string} type - Message type (success, error, warning, info)
   * @param {Object} options - Additional display options
   * @param {boolean} options.autoDismiss - Whether to auto-dismiss
   * @param {number} options.duration - Duration before auto-dismiss
   */
  showSettingsActionStatus(message) {
    let type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'info';
    let options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const settingsActionStatus = document.getElementById('settings-action-status');
    if (!settingsActionStatus) {
      this.logger.warn('Settings action status element not found');
      return;
    }

    // Clear existing content
    settingsActionStatus.innerHTML = '';
    settingsActionStatus.className = `settings-action-status ${type}`;

    // Create status content
    const statusContent = document.createElement('div');
    statusContent.className = 'status-content';
    const text = document.createElement('span');
    text.textContent = message;
    statusContent.appendChild(text);
    const icon = document.createElement('i');
    icon.className = `fas ${this.getStatusIcon(type)}`;
    statusContent.appendChild(icon);
    settingsActionStatus.appendChild(statusContent);
    settingsActionStatus.style.display = 'block';

    // No auto-dismiss for any type
    this.logger.info('Settings action status shown', {
      message,
      type,
      autoDismiss: false
    });
  }

  /**
   * Get appropriate icon class for status type
   * @param {string} type - Status type
   * @returns {string} Icon class name
   */
  getStatusIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  /**
   * Hide settings action status
   */
  hideSettingsActionStatus() {
    const settingsActionStatus = document.getElementById('settings-action-status');
    if (settingsActionStatus) {
      settingsActionStatus.style.display = 'none';
      this.logger.debug('Settings action status hidden');
    }
  }

  /**
   * Show import status with operation details
   * @param {string} status - Import status
   * @param {string} message - Status message
   * @param {Object} details - Additional details
   */
  showImportStatus(status) {
    let message = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
    let details = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const importStatus = document.getElementById('import-status');
    if (!importStatus) {
      this.logger.warn('Import status element not found');
      return;
    }
    importStatus.style.display = 'block';
    importStatus.className = `import-status ${status}`;
    const statusText = importStatus.querySelector('.status-text');
    if (statusText) {
      statusText.textContent = message || status;
    }
    this.logger.info('Import status shown', {
      status,
      message,
      details
    });
  }

  /**
   * Clear all notifications from the UI
   */
  clearNotifications() {
    if (this.notificationContainer) {
      this.notificationContainer.innerHTML = '';
      this.logger.debug('All notifications cleared');
    }
    this.clearStatusBar();
  }

  /**
   * Hide progress display
   */
  hideProgress() {
    if (this.progressContainer) {
      const safeDOM = window.safeDOM || new _safeDom.SafeDOM(this.logger);
      safeDOM.hide(this.progressContainer);
      this.logger.debug('Progress display hidden');
    }
  }

  /**
   * Show progress section with enhanced debugging and fallback mechanisms
   */
  showProgress() {
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] showProgress() called');
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] this.progressContainer:', this.progressContainer);

    // Try multiple ways to get the progress container
    let progressContainer = this.progressContainer;
    if (!progressContainer) {
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found in UI manager, trying direct access...');
      progressContainer = document.getElementById('progress-container');
    }
    if (!progressContainer) {
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found by ID, trying ElementRegistry...');
      if (typeof _elementRegistry.ElementRegistry !== 'undefined' && _elementRegistry.ElementRegistry.progressContainer) {
        progressContainer = _elementRegistry.ElementRegistry.progressContainer();
      }
    }
    if (!progressContainer) {
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container not found by ElementRegistry, trying class selector...');
      progressContainer = document.querySelector('.progress-container');
    }
    if (!progressContainer) {
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Progress container not found by any method');
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Available containers with "progress" in ID:', Array.from(document.querySelectorAll('[id*="progress"]')).map(el => el.id));
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Available containers with "progress" in class:', Array.from(document.querySelectorAll('[class*="progress"]')).map(el => ({
        id: el.id,
        className: el.className
      })));
      return;
    }
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Progress container found, showing...');
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Current display style:', progressContainer.style.display);
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Current visibility:', progressContainer.offsetParent !== null ? 'visible' : 'hidden');

    // Force show the progress container
    progressContainer.style.display = 'block';
    progressContainer.style.visibility = 'visible';
    progressContainer.style.opacity = '1';

    // Ensure it's not hidden by CSS
    progressContainer.classList.remove('hidden', 'd-none');
    progressContainer.classList.add('visible');

    // Force layout recalculation
    progressContainer.offsetHeight;
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Display style after setting to block:', progressContainer.style.display);
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Container visibility:', progressContainer.offsetParent !== null ? 'visible' : 'hidden');
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Container dimensions:', {
      offsetWidth: progressContainer.offsetWidth,
      offsetHeight: progressContainer.offsetHeight,
      clientWidth: progressContainer.clientWidth,
      clientHeight: progressContainer.clientHeight
    });

    // Scroll into view if needed
    if (progressContainer.offsetParent !== null) {
      progressContainer.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }

    // Update UI manager's reference
    this.progressContainer = progressContainer;
    this.logger.debug('Progress display shown');

    // Additional verification
    setTimeout(() => {
      const isVisible = progressContainer.offsetParent !== null;
      const rect = progressContainer.getBoundingClientRect();
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Final verification:', {
        isVisible,
        dimensions: {
          width: rect.width,
          height: rect.height
        },
        display: progressContainer.style.display,
        computedDisplay: window.getComputedStyle(progressContainer).display
      });
    }, 100);
  }

  /**
   * Set button loading state
   * @param {string} buttonId - Button element ID
   * @param {boolean} isLoading - Whether to show loading state
   */
  setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (!button) {
      // Don't log warning for buttons that are intentionally hidden or optional
      if (buttonId === 'get-token-quick') {
        this.logger.debug(`Button with ID '${buttonId}' not found (may be hidden)`);
      } else {
        this.logger.warn(`Button with ID '${buttonId}' not found`);
      }
      return;
    }
    if (isLoading) {
      button.disabled = true;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.innerHTML = button.getAttribute('data-original-text') || 'Submit';
      button.classList.remove('loading');
    }
    this.logger.debug('Button loading state updated', {
      buttonId,
      isLoading
    });
  }

  /**
   * Update population dropdown fields with available populations
   * @param {Array} populations - Array of population objects
   */
  updatePopulationFields(populations) {
    if (!populations || !Array.isArray(populations)) {
      this.logger.warn('Invalid populations data provided');
      return;
    }
    const populationSelects = document.querySelectorAll('select[id*="population"]');
    populationSelects.forEach(select => {
      // Store current selection
      const currentValue = select.value;

      // Clear existing options
      select.innerHTML = '';

      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.value = '';
      defaultOption.textContent = 'Select a population...';
      select.appendChild(defaultOption);

      // Add population options
      populations.forEach(population => {
        const option = document.createElement('option');
        option.value = population.id;
        option.textContent = population.name;
        select.appendChild(option);
      });

      // Restore selection if it still exists
      if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
      }
    });
    this.logger.info('Population fields updated', {
      populationCount: populations.length,
      selectCount: populationSelects.length
    });
  }

  /**
   * Show notification with enhanced options
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {Object} options - Additional display options
   * @param {boolean} options.autoDismiss - Whether to auto-dismiss
   * @param {number} options.duration - Duration before auto-dismiss
   */
  showNotification(title, message) {
    let type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'info';
    let options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    if (!this.notificationContainer) {
      this.logger.warn('Notification container not found');
      return;
    }

    // Clear existing content
    this.notificationContainer.innerHTML = '';

    // Create status header content
    const statusContent = document.createElement('div');
    statusContent.className = 'status-content';

    // Add icon
    const icon = document.createElement('i');
    icon.className = `fas ${this.getStatusIcon(type)}`;
    statusContent.appendChild(icon);

    // Add text
    const text = document.createElement('span');
    if (title && message) {
      text.textContent = `${title}: ${message}`;
    } else {
      text.textContent = title || message;
    }
    statusContent.appendChild(text);

    // Add to container
    this.notificationContainer.appendChild(statusContent);

    // Auto-dismiss if specified (but keep persistent for success messages)
    const shouldAutoDismiss = options.autoDismiss !== false && type !== 'error' && type !== 'success';
    if (shouldAutoDismiss) {
      const duration = options.duration || 5000;
      setTimeout(() => {
        if (this.notificationContainer && this.notificationContainer.contains(statusContent)) {
          this.notificationContainer.innerHTML = '';
        }
      }, duration);
    }
    this.logger.info('Status header updated', {
      title,
      message,
      type,
      autoDismiss: shouldAutoDismiss
    });
  }

  /**
   * Update import progress with detailed statistics
   * @param {number} current - Current progress value
   * @param {number} total - Total progress value
   * @param {string} message - Progress message
   * @param {Object} counts - Statistics counts
   * @param {number} counts.processed - Number of processed items
   * @param {number} counts.success - Number of successful items
   * @param {number} counts.failed - Number of failed items
   * @param {number} counts.skipped - Number of skipped items
   * @param {string} populationName - Population name
   * @param {string} populationId - Population ID
   */
  updateImportProgress(current, total) {
    let message = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    let counts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    let populationName = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '';
    let populationId = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : '';
    // Update main progress
    this.updateProgress(current, total, message);

    // Update statistics if provided
    if (counts && typeof counts === 'object') {
      Object.entries(counts).forEach(_ref => {
        let [key, value] = _ref;
        const statElement = document.querySelector(`.stat-value.${key}`);
        if (statElement) {
          statElement.textContent = value || 0;
        }
      });
    }

    // Update population information if provided
    if (populationName || populationId) {
      const populationElement = document.querySelector('.detail-value.population-info');
      if (populationElement) {
        populationElement.textContent = populationName || populationId || 'Unknown';
      }
    }
    this.logger.debug('Import progress updated', {
      current,
      total,
      message,
      counts,
      populationName,
      populationId
    });
  }

  /**
   * Start import operation with progress tracking
   * @param {Object} options - Operation options
   * @param {string} options.operationType - Type of operation
   * @param {number} options.totalUsers - Total number of users
   * @param {string} options.populationName - Population name
   * @param {string} options.populationId - Population ID
   */
  startImportOperation() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] startImportOperation() called with options:', options);
    const {
      operationType,
      totalUsers,
      populationName,
      populationId
    } = options;
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] About to call showProgress()...');
    this.showProgress();
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] showProgress() completed');
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] About to call updateProgress()...');
    this.updateProgress(0, totalUsers || 0, 'Starting import operation...');
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] updateProgress() completed');

    // Update operation details
    const operationTypeElement = document.querySelector('.detail-value.operation-type');
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Operation type element:', operationTypeElement);
    if (operationTypeElement) {
      operationTypeElement.textContent = operationType || 'Import';
      (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] Operation type updated to:', operationType || 'Import');
    } else {
      (window.logger?.error || console.error)('🔍 [UI MANAGER DEBUG] Operation type element not found');
    }
    this.logger.info('Import operation started', {
      operationType,
      totalUsers,
      populationName,
      populationId
    });
    (window.logger?.debug || console.log)('🔍 [UI MANAGER DEBUG] startImportOperation() completed');
  }

  /**
   * Update import operation with session ID
   * @param {string} sessionId - Session ID for tracking
   */
  updateImportOperationWithSessionId(sessionId) {
    if (!sessionId) {
      this.logger.warn('No session ID provided for import operation');
      return;
    }
    const sessionElement = document.querySelector('.detail-value.session-id');
    if (sessionElement) {
      sessionElement.textContent = sessionId;
    }
    this.logger.info('Import operation session ID updated', {
      sessionId
    });
  }

  /**
   * Start export operation with progress tracking
   * @param {Object} options - Operation options
   * @param {number} options.totalUsers - Total number of users
   * @param {string} options.populationName - Population name
   */
  startExportOperation() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const {
      totalUsers,
      populationName
    } = options;
    this.showProgress();
    this.updateProgress(0, totalUsers || 0, 'Starting export operation...');
    const operationTypeElement = document.querySelector('.detail-value.operation-type');
    if (operationTypeElement) {
      operationTypeElement.textContent = 'Export';
    }
    this.logger.info('Export operation started', {
      totalUsers,
      populationName
    });
  }

  /**
   * Start delete operation with progress tracking
   * @param {Object} options - Operation options
   * @param {number} options.totalUsers - Total number of users
   * @param {string} options.populationName - Population name
   */
  startDeleteOperation() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const {
      totalUsers,
      populationName
    } = options;
    this.showProgress();
    this.updateProgress(0, totalUsers || 0, 'Starting delete operation...');
    const operationTypeElement = document.querySelector('.detail-value.operation-type');
    if (operationTypeElement) {
      operationTypeElement.textContent = 'Delete';
    }
    this.logger.info('Delete operation started', {
      totalUsers,
      populationName
    });
  }

  /**
   * Start modify operation with progress tracking
   * @param {Object} options - Operation options
   * @param {number} options.totalUsers - Total number of users
   * @param {string} options.populationName - Population name
   */
  startModifyOperation() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const {
      totalUsers,
      populationName
    } = options;
    this.showProgress();
    this.updateProgress(0, totalUsers || 0, 'Starting modify operation...');
    const operationTypeElement = document.querySelector('.detail-value.operation-type');
    if (operationTypeElement) {
      operationTypeElement.textContent = 'Modify';
    }
    this.logger.info('Modify operation started', {
      totalUsers,
      populationName
    });
  }

  /**
   * Complete operation with results
   * @param {Object} results - Operation results
   * @param {number} results.processed - Number of processed items
   * @param {number} results.success - Number of successful items
   * @param {number} results.failed - Number of failed items
   * @param {number} results.skipped - Number of skipped items
   */
  completeOperation() {
    let results = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const {
      processed,
      success,
      failed,
      skipped
    } = results;
    this.updateProgress(processed || 0, processed || 0, 'Operation completed');

    // Show completion message
    const message = `Operation completed: ${success || 0} successful, ${failed || 0} failed, ${skipped || 0} skipped`;
    this.showSuccess(message);

    // Hide progress after delay
    setTimeout(() => {
      this.hideProgress();
    }, 2000);
    this.logger.info('Operation completed', {
      processed,
      success,
      failed,
      skipped
    });
  }

  /**
   * Handle duplicate users with decision callback
   * @param {Array} duplicates - Array of duplicate user objects
   * @param {Function} onDecision - Callback function for user decision
   */
  handleDuplicateUsers(duplicates, onDecision) {
    if (!duplicates || duplicates.length === 0) {
      this.logger.warn('No duplicates provided for handling');
      return;
    }
    const message = `Found ${duplicates.length} duplicate users. How would you like to proceed?`;
    this.showWarning(message);

    // In a real implementation, you would show a modal or dialog here
    // For now, we'll just log the decision
    this.logger.info('Duplicate users found', {
      count: duplicates.length
    });
    if (onDecision && typeof onDecision === 'function') {
      onDecision('skip'); // Default to skip
    }
  }

  /**
   * Debug logging for development
   * @param {string} area - Debug area
   * @param {string} message - Debug message
   */
  debugLog(area, message) {
    if (DEBUG_MODE) {
      this.logger.debug(`[${area}] ${message}`);
    }
  }

  /**
   * Show status message with type
   * @param {string} type - Message type
   * @param {string} message - Message content
   * @param {string} details - Additional details
   */
  showStatusMessage(type, message) {
    let details = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
    const fullMessage = details ? `${message}: ${details}` : message;
    this.showNotification('Status Update', fullMessage, type);
  }

  /**
   * Show export status
   */
  showExportStatus() {
    this.showProgress();
    this.updateProgress(0, 100, 'Preparing export...');
    this.logger.info('Export status shown');
  }

  /**
   * Show startup wait screen
   * @param {string} message - Optional startup message
   */
  showStartupWaitScreen() {
    let message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Initializing application...';
    try {
      // Find or create startup wait screen
      let startupScreen = document.getElementById('startup-wait-screen');
      if (!startupScreen) {
        // Create startup screen if it doesn't exist
        startupScreen = document.createElement('div');
        startupScreen.id = 'startup-wait-screen';
        startupScreen.className = 'startup-wait-screen';
        startupScreen.innerHTML = `
                    <div class="startup-content">
                        <div class="startup-spinner"></div>
                        <div class="startup-message">${message}</div>
                    </div>
                `;
        document.body.appendChild(startupScreen);
      } else {
        // Update existing message
        const messageElement = startupScreen.querySelector('.startup-message');
        if (messageElement) {
          messageElement.textContent = message;
        }
      }

      // Show the startup screen
      startupScreen.style.display = 'flex';
      this.logger.debug('Startup wait screen shown', {
        message
      });
    } catch (error) {
      this.logger.error('Error showing startup wait screen:', error);
    }
  }

  /**
   * Hide startup wait screen
   */
  hideStartupWaitScreen() {
    try {
      const startupScreen = document.getElementById('startup-wait-screen');
      if (startupScreen) {
        startupScreen.style.display = 'none';
        this.logger.debug('Startup wait screen hidden');
      }
    } catch (error) {
      this.logger.error('Error hiding startup wait screen:', error);
    }
  }

  /**
   * Update startup message on existing startup screen
   * @param {string} message - New startup message
   */
  updateStartupMessage(message) {
    try {
      const startupScreen = document.getElementById('startup-wait-screen');
      if (startupScreen) {
        const messageElement = startupScreen.querySelector('.startup-message');
        if (messageElement) {
          messageElement.textContent = message;
          this.logger.debug('Startup message updated', {
            message
          });
        } else {
          this.logger.warn('Startup message element not found');
        }
      } else {
        // If no startup screen exists, show it with the message
        this.showStartupWaitScreen(message);
      }
    } catch (error) {
      this.logger.error('Error updating startup message:', error);
    }
  }

  /**
   * Update export progress
   * @param {number} current - Current progress
   * @param {number} total - Total progress
   * @param {string} message - Progress message
   * @param {Object} counts - Statistics counts
   */
  updateExportProgress(current, total, message) {
    let counts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    this.updateProgress(current, total, message);

    // Update export-specific statistics
    if (counts && typeof counts === 'object') {
      Object.entries(counts).forEach(_ref2 => {
        let [key, value] = _ref2;
        const statElement = document.querySelector(`.stat-value.${key}`);
        if (statElement) {
          statElement.textContent = value || 0;
        }
      });
    }
    this.logger.debug('Export progress updated', {
      current,
      total,
      message,
      counts
    });
  }

  /**
   * Show delete status
   * @param {number} totalUsers - Total number of users
   * @param {string} populationName - Population name
   * @param {string} populationId - Population ID
   */
  showDeleteStatus(totalUsers, populationName, populationId) {
    this.showProgress();
    this.updateProgress(0, totalUsers || 0, 'Preparing delete operation...');
    const operationTypeElement = document.querySelector('.detail-value.operation-type');
    if (operationTypeElement) {
      operationTypeElement.textContent = 'Delete';
    }
    this.logger.info('Delete status shown', {
      totalUsers,
      populationName,
      populationId
    });
  }

  /**
   * Update delete progress
   * @param {number} current - Current progress
   * @param {number} total - Total progress
   * @param {string} message - Progress message
   * @param {Object} counts - Statistics counts
   * @param {string} populationName - Population name
   * @param {string} populationId - Population ID
   */
  updateDeleteProgress(current, total, message) {
    let counts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    let populationName = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : '';
    let populationId = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : '';
    this.updateProgress(current, total, message);

    // Update delete-specific statistics
    if (counts && typeof counts === 'object') {
      Object.entries(counts).forEach(_ref3 => {
        let [key, value] = _ref3;
        const statElement = document.querySelector(`.stat-value.${key}`);
        if (statElement) {
          statElement.textContent = value || 0;
        }
      });
    }
    this.logger.debug('Delete progress updated', {
      current,
      total,
      message,
      counts,
      populationName,
      populationId
    });
  }

  /**
   * Show modify status
   * @param {number} totalUsers - Total number of users
   */
  showModifyStatus(totalUsers) {
    this.showProgress();
    this.updateProgress(0, totalUsers || 0, 'Preparing modify operation...');
    const operationTypeElement = document.querySelector('.detail-value.operation-type');
    if (operationTypeElement) {
      operationTypeElement.textContent = 'Modify';
    }
    this.logger.info('Modify status shown', {
      totalUsers
    });
  }

  /**
   * Update modify progress
   * @param {number} current - Current progress
   * @param {number} total - Total progress
   * @param {string} message - Progress message
   * @param {Object} counts - Statistics counts
   */
  updateModifyProgress(current, total, message) {
    let counts = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};
    this.updateProgress(current, total, message);

    // Update modify-specific statistics
    if (counts && typeof counts === 'object') {
      Object.entries(counts).forEach(_ref4 => {
        let [key, value] = _ref4;
        const statElement = document.querySelector(`.stat-value.${key}`);
        if (statElement) {
          statElement.textContent = value || 0;
        }
      });
    }
    this.logger.debug('Modify progress updated', {
      current,
      total,
      message,
      counts
    });
  }
}

// Export the UIManager class
exports.UIManager = UIManager;

}).call(this)}).call(this,require('_process'))
},{"../../../public/js/modules/circular-progress.js":38,"../../../public/js/modules/element-registry.js":39,"../../../public/js/modules/error/error-types.js":40,"../../../public/js/modules/progress-manager.js":42,"../../../public/js/modules/utils/safe-dom.js":44,"@babel/runtime/helpers/interopRequireDefault":1,"_process":37}],50:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AdvancedRealtimeSubsystem = void 0;
/**
 * Advanced Real-time Features Subsystem
 * 
 * Provides advanced real-time capabilities including:
 * - Multi-user collaboration and presence
 * - Live progress sharing across sessions
 * - Real-time notifications and alerts
 * - Collaborative operation management
 * - Live analytics and metrics streaming
 * - Cross-session synchronization
 */

class AdvancedRealtimeSubsystem {
  constructor(logger, eventBus, realtimeCommunication, sessionSubsystem, progressSubsystem) {
    this.logger = logger;
    this.eventBus = eventBus;
    this.realtimeCommunication = realtimeCommunication;
    this.sessionSubsystem = sessionSubsystem;
    this.progressSubsystem = progressSubsystem;

    // Multi-user state management
    this.activeUsers = new Map();
    this.collaborationRooms = new Map();
    this.sharedOperations = new Map();

    // Real-time features state
    this.liveProgressStreams = new Map();
    this.notificationQueues = new Map();
    this.analyticsStreams = new Map();

    // Configuration
    this.config = {
      maxUsersPerRoom: 10,
      progressUpdateInterval: 1000,
      presenceUpdateInterval: 5000,
      notificationRetention: 100,
      analyticsBufferSize: 1000
    };
    this.logger.info('Advanced Real-time Features Subsystem initialized');
  }

  /**
   * Initialize the advanced real-time subsystem
   */
  async init() {
    try {
      // Set up EventBus listeners for real-time coordination
      this.setupEventBusListeners();

      // Initialize multi-user presence system
      await this.initializePresenceSystem();

      // Set up live progress sharing
      await this.initializeLiveProgressSharing();

      // Initialize real-time notifications
      await this.initializeNotificationSystem();

      // Set up collaborative operation management
      await this.initializeCollaborativeOperations();

      // Initialize live analytics streaming
      await this.initializeLiveAnalytics();
      this.logger.info('Advanced Real-time Features Subsystem initialized successfully');
      this.eventBus.emit('subsystem:ready', {
        subsystem: 'advanced-realtime'
      });
    } catch (error) {
      this.logger.error('Failed to initialize Advanced Real-time Features Subsystem', error);
      this.eventBus.emit('subsystem:error', {
        subsystem: 'advanced-realtime',
        error
      });
      throw error;
    }
  }

  /**
   * Set up EventBus listeners for real-time coordination
   */
  setupEventBusListeners() {
    this.logger.debug('Setting up EventBus listeners for advanced real-time features');

    // User session events
    this.eventBus.on('session:user-joined', data => this.handleUserJoined(data));
    this.eventBus.on('session:user-left', data => this.handleUserLeft(data));
    this.eventBus.on('session:activity-update', data => this.handleActivityUpdate(data));

    // Operation events for collaboration
    this.eventBus.on('operation:started', data => this.handleOperationStarted(data));
    this.eventBus.on('operation:progress', data => this.handleOperationProgress(data));
    this.eventBus.on('operation:completed', data => this.handleOperationCompleted(data));
    this.eventBus.on('operation:failed', data => this.handleOperationFailed(data));

    // Progress events for live sharing
    this.eventBus.on('progress:updated', data => this.handleProgressUpdate(data));
    this.eventBus.on('progress:milestone', data => this.handleProgressMilestone(data));

    // Analytics events for live streaming
    this.eventBus.on('analytics:metric-update', data => this.handleAnalyticsUpdate(data));
    this.eventBus.on('analytics:performance-data', data => this.handlePerformanceData(data));
    this.logger.debug('EventBus listeners set up for advanced real-time features');
  }

  /**
   * Initialize multi-user presence system
   */
  async initializePresenceSystem() {
    this.logger.debug('Initializing multi-user presence system');

    // Set up presence broadcasting
    this.presenceInterval = setInterval(() => {
      this.broadcastPresence();
    }, this.config.presenceUpdateInterval);

    // Listen for presence updates from other users
    this.realtimeCommunication.on('user-presence', data => {
      this.handlePresenceUpdate(data);
    });

    // Handle user connection/disconnection
    this.realtimeCommunication.on('user-connected', data => {
      this.handleUserConnected(data);
    });
    this.realtimeCommunication.on('user-disconnected', data => {
      this.handleUserDisconnected(data);
    });
    this.logger.debug('Multi-user presence system initialized');
  }

  /**
   * Initialize live progress sharing
   */
  async initializeLiveProgressSharing() {
    this.logger.debug('Initializing live progress sharing');

    // Set up progress streaming
    this.progressInterval = setInterval(() => {
      this.streamProgressUpdates();
    }, this.config.progressUpdateInterval);

    // Listen for shared progress updates
    this.realtimeCommunication.on('progress-update', data => {
      this.handleSharedProgressUpdate(data);
    });

    // Handle progress synchronization requests
    this.realtimeCommunication.on('progress-sync-request', data => {
      this.handleProgressSyncRequest(data);
    });
    this.logger.debug('Live progress sharing initialized');
  }

  /**
   * Broadcast presence to connected users
   */
  broadcastPresence() {
    try {
      if (!this.currentRoom || !this.currentUser) {
        return;
      }
      const presenceData = {
        roomId: this.currentRoom,
        userId: this.currentUser.id || 'anonymous',
        userName: this.currentUser.name || 'Anonymous User',
        status: 'active',
        lastActivity: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      // Broadcast presence to room
      this.realtimeCommunication.emit('user-presence', presenceData);

      // Update local presence
      this.activeUsers.set(presenceData.userId, {
        ...presenceData,
        joinedAt: this.activeUsers.get(presenceData.userId)?.joinedAt || new Date()
      });

      // Emit local event for UI updates
      this.eventBus.emit('realtime:presence-broadcasted', presenceData);
      this.logger.debug('Presence broadcasted', {
        roomId: this.currentRoom,
        userId: presenceData.userId
      });
    } catch (error) {
      this.logger.error('Failed to broadcast presence', error);
    }
  }

  /**
   * Stream progress updates to connected users
   */
  streamProgressUpdates() {
    try {
      if (!this.currentRoom || !this.progressSubsystem) {
        return;
      }

      // Get current progress from progress subsystem
      const progressData = this.progressSubsystem.getCurrentProgress();
      if (progressData && progressData.isActive) {
        const updateData = {
          roomId: this.currentRoom,
          userId: this.currentUser?.id || 'anonymous',
          userName: this.currentUser?.name || 'Anonymous User',
          progress: {
            operationType: progressData.operationType,
            percentage: progressData.percentage,
            currentStep: progressData.currentStep,
            totalSteps: progressData.totalSteps,
            message: progressData.message,
            timestamp: new Date().toISOString()
          }
        };

        // Broadcast progress update to room
        this.realtimeCommunication.emit('progress-update', updateData);

        // Update local shared progress
        this.sharedProgress.set(updateData.userId, updateData.progress);

        // Emit local event for UI updates
        this.eventBus.emit('realtime:progress-streamed', updateData);
        this.logger.debug('Progress update streamed', {
          roomId: this.currentRoom,
          userId: updateData.userId,
          percentage: progressData.percentage
        });
      }
    } catch (error) {
      this.logger.error('Failed to stream progress updates', error);
    }
  }

  /**
   * Initialize real-time notification system
   */
  async initializeNotificationSystem() {
    this.logger.debug('Initializing real-time notification system');

    // Listen for notification events
    this.realtimeCommunication.on('notification', data => {
      this.handleIncomingNotification(data);
    });

    // Set up notification broadcasting
    this.eventBus.on('notification:send', data => {
      this.broadcastNotification(data);
    });
    this.logger.debug('Real-time notification system initialized');
  }

  /**
   * Initialize collaborative operation management
   */
  async initializeCollaborativeOperations() {
    this.logger.debug('Initializing collaborative operation management');

    // Listen for collaborative operation events
    this.realtimeCommunication.on('operation-request', data => {
      this.handleOperationRequest(data);
    });
    this.realtimeCommunication.on('operation-lock', data => {
      this.handleOperationLock(data);
    });
    this.realtimeCommunication.on('operation-unlock', data => {
      this.handleOperationUnlock(data);
    });
    this.logger.debug('Collaborative operation management initialized');
  }

  /**
   * Initialize live analytics streaming
   */
  async initializeLiveAnalytics() {
    this.logger.debug('Initializing live analytics streaming');

    // Set up analytics data streaming
    this.analyticsInterval = setInterval(() => {
      this.streamAnalyticsData();
    }, 5000); // Stream analytics every 5 seconds

    // Listen for analytics updates from other sessions
    this.realtimeCommunication.on('analytics-update', data => {
      this.handleAnalyticsStreamUpdate(data);
    });
    this.logger.debug('Live analytics streaming initialized');
  }

  /**
   * Stream analytics data to connected users
   */
  streamAnalyticsData() {
    try {
      if (!this.currentRoom || !this.analyticsDashboard) {
        return;
      }

      // Get current analytics data from analytics dashboard subsystem
      const analyticsData = this.analyticsDashboard.getAnalyticsDashboardData('5m');
      if (analyticsData) {
        const streamData = {
          roomId: this.currentRoom,
          userId: this.currentUser?.id || 'anonymous',
          analytics: {
            systemMetrics: analyticsData.systemMetrics,
            operationSummary: analyticsData.operationSummary,
            recentActivity: analyticsData.recentActivity?.slice(0, 5),
            // Last 5 activities
            timestamp: new Date().toISOString()
          }
        };

        // Broadcast analytics update to room
        this.realtimeCommunication.emit('analytics-update', streamData);

        // Emit local event for UI updates
        this.eventBus.emit('realtime:analytics-streamed', streamData);
        this.logger.debug('Analytics data streamed', {
          roomId: this.currentRoom,
          userId: streamData.userId,
          metricsCount: Object.keys(streamData.analytics.systemMetrics || {}).length
        });
      }
    } catch (error) {
      this.logger.error('Failed to stream analytics data', error);
    }
  }

  /**
   * Join a collaboration room
   */
  async joinCollaborationRoom(roomId, userInfo) {
    this.logger.info('Joining collaboration room', {
      roomId,
      userId: userInfo.id
    });
    try {
      // Check room capacity
      if (this.collaborationRooms.has(roomId)) {
        const room = this.collaborationRooms.get(roomId);
        if (room.users.size >= this.config.maxUsersPerRoom) {
          throw new Error('Collaboration room is at capacity');
        }
      } else {
        // Create new room
        this.collaborationRooms.set(roomId, {
          id: roomId,
          users: new Map(),
          operations: new Map(),
          createdAt: new Date(),
          lastActivity: new Date()
        });
      }
      const room = this.collaborationRooms.get(roomId);
      room.users.set(userInfo.id, {
        ...userInfo,
        joinedAt: new Date(),
        lastSeen: new Date(),
        isActive: true
      });

      // Broadcast user joined event
      this.broadcastToRoom(roomId, 'user-joined', {
        roomId,
        user: userInfo,
        totalUsers: room.users.size
      });

      // Send room state to new user
      this.sendToUser(userInfo.id, 'room-state', {
        roomId,
        users: Array.from(room.users.values()),
        operations: Array.from(room.operations.values())
      });
      this.eventBus.emit('collaboration:user-joined', {
        roomId,
        user: userInfo
      });
      return {
        success: true,
        roomId,
        userCount: room.users.size,
        users: Array.from(room.users.values())
      };
    } catch (error) {
      this.logger.error('Failed to join collaboration room', {
        roomId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Leave a collaboration room
   */
  async leaveCollaborationRoom(roomId, userId) {
    this.logger.info('Leaving collaboration room', {
      roomId,
      userId
    });
    try {
      if (!this.collaborationRooms.has(roomId)) {
        return {
          success: true,
          message: 'Room does not exist'
        };
      }
      const room = this.collaborationRooms.get(roomId);
      const user = room.users.get(userId);
      if (user) {
        room.users.delete(userId);

        // Broadcast user left event
        this.broadcastToRoom(roomId, 'user-left', {
          roomId,
          userId,
          user,
          totalUsers: room.users.size
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          this.collaborationRooms.delete(roomId);
          this.logger.debug('Removed empty collaboration room', {
            roomId
          });
        }
        this.eventBus.emit('collaboration:user-left', {
          roomId,
          userId,
          user
        });
      }
      return {
        success: true,
        roomId,
        userCount: room.users.size
      };
    } catch (error) {
      this.logger.error('Failed to leave collaboration room', {
        roomId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start live progress sharing for an operation
   */
  async startLiveProgressSharing(operationId) {
    let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.logger.info('Starting live progress sharing', {
      operationId
    });
    try {
      const progressStream = {
        operationId,
        startTime: new Date(),
        lastUpdate: new Date(),
        subscribers: new Set(),
        config: {
          updateInterval: config.updateInterval || this.config.progressUpdateInterval,
          includeMetrics: config.includeMetrics || true,
          includeErrors: config.includeErrors || true,
          maxHistory: config.maxHistory || 100
        },
        history: [],
        currentProgress: {
          percentage: 0,
          stage: 'initializing',
          message: 'Starting operation...',
          metrics: {}
        }
      };
      this.liveProgressStreams.set(operationId, progressStream);

      // Broadcast progress sharing started
      this.broadcastProgressEvent('progress-sharing-started', {
        operationId,
        config: progressStream.config
      });
      this.eventBus.emit('progress-sharing:started', {
        operationId,
        config: progressStream.config
      });
      return {
        success: true,
        operationId,
        streamId: operationId
      };
    } catch (error) {
      this.logger.error('Failed to start live progress sharing', {
        operationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Subscribe to live progress updates
   */
  async subscribeLiveProgress(operationId, subscriberId) {
    this.logger.debug('Subscribing to live progress', {
      operationId,
      subscriberId
    });
    if (!this.liveProgressStreams.has(operationId)) {
      throw new Error(`Progress stream not found for operation: ${operationId}`);
    }
    const stream = this.liveProgressStreams.get(operationId);
    stream.subscribers.add(subscriberId);

    // Send current progress state to new subscriber
    this.sendProgressUpdate(subscriberId, {
      operationId,
      progress: stream.currentProgress,
      history: stream.history.slice(-10) // Send last 10 updates
    });
    this.logger.debug('Subscribed to live progress', {
      operationId,
      subscriberId,
      totalSubscribers: stream.subscribers.size
    });
    return {
      success: true,
      operationId,
      subscriberId
    };
  }

  /**
   * Send real-time notification
   */
  async sendRealtimeNotification(notification) {
    this.logger.debug('Sending real-time notification', {
      type: notification.type,
      recipients: notification.recipients?.length
    });
    try {
      const notificationData = {
        id: this.generateId(),
        timestamp: new Date(),
        ...notification
      };

      // Store in notification queues for recipients
      if (notification.recipients) {
        notification.recipients.forEach(recipientId => {
          if (!this.notificationQueues.has(recipientId)) {
            this.notificationQueues.set(recipientId, []);
          }
          const queue = this.notificationQueues.get(recipientId);
          queue.push(notificationData);

          // Maintain queue size
          if (queue.length > this.config.notificationRetention) {
            queue.shift();
          }
        });
      }

      // Broadcast notification
      this.broadcastNotification(notificationData);
      this.eventBus.emit('notification:sent', notificationData);
      return {
        success: true,
        notificationId: notificationData.id
      };
    } catch (error) {
      this.logger.error('Failed to send real-time notification', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get live analytics dashboard data
   */
  async getLiveAnalyticsDashboard() {
    this.logger.debug('Getting live analytics dashboard data');
    try {
      const dashboardData = {
        timestamp: new Date(),
        activeUsers: this.activeUsers.size,
        collaborationRooms: this.collaborationRooms.size,
        liveProgressStreams: this.liveProgressStreams.size,
        totalNotifications: Array.from(this.notificationQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
        connectionStatus: this.realtimeCommunication.getConnectionStatus(),
        systemMetrics: await this.getSystemMetrics(),
        operationMetrics: await this.getOperationMetrics(),
        userActivity: await this.getUserActivityMetrics()
      };
      return dashboardData;
    } catch (error) {
      this.logger.error('Failed to get live analytics dashboard data', {
        error: error.message
      });
      throw error;
    }
  }

  // Event Handlers

  handleUserJoined(data) {
    this.logger.debug('Handling user joined event', data);
    this.activeUsers.set(data.userId, {
      ...data,
      joinedAt: new Date(),
      lastActivity: new Date()
    });
    this.broadcastPresenceUpdate();
  }
  handleUserLeft(data) {
    this.logger.debug('Handling user left event', data);
    this.activeUsers.delete(data.userId);
    this.broadcastPresenceUpdate();
  }
  handleOperationStarted(data) {
    this.logger.debug('Handling operation started event', data);
    if (data.shareProgress) {
      this.startLiveProgressSharing(data.operationId, data.progressConfig);
    }
  }
  handleOperationProgress(data) {
    this.logger.debug('Handling operation progress event', data);
    if (this.liveProgressStreams.has(data.operationId)) {
      this.updateLiveProgress(data.operationId, data.progress);
    }
  }
  handleProgressUpdate(data) {
    this.logger.debug('Handling progress update event', data);
    this.streamProgressUpdate(data);
  }

  // Utility Methods

  broadcastToRoom(roomId, event, data) {
    if (this.collaborationRooms.has(roomId)) {
      const room = this.collaborationRooms.get(roomId);
      room.users.forEach((user, userId) => {
        this.sendToUser(userId, event, data);
      });
    }
  }
  sendToUser(userId, event, data) {
    // Send via real-time communication
    if (this.realtimeCommunication.isConnected) {
      this.realtimeCommunication.socket?.emit('user-message', {
        targetUserId: userId,
        event,
        data
      });
    }
  }
  broadcastPresenceUpdate() {
    const presenceData = {
      activeUsers: Array.from(this.activeUsers.values()),
      timestamp: new Date()
    };
    this.realtimeCommunication.socket?.emit('presence-update', presenceData);
    this.eventBus.emit('presence:updated', presenceData);
  }
  streamProgressUpdate(progressData) {
    this.realtimeCommunication.socket?.emit('progress-stream', progressData);
    this.eventBus.emit('progress-stream:update', progressData);
  }
  broadcastNotification(notification) {
    this.realtimeCommunication.socket?.emit('notification-broadcast', notification);
  }
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  async getSystemMetrics() {
    return {
      memoryUsage: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null,
      connectionLatency: await this.measureConnectionLatency(),
      timestamp: new Date()
    };
  }
  async getOperationMetrics() {
    return {
      activeOperations: this.liveProgressStreams.size,
      completedOperations: 0,
      // Would be tracked elsewhere
      failedOperations: 0,
      // Would be tracked elsewhere
      averageOperationTime: 0,
      // Would be calculated from history
      timestamp: new Date()
    };
  }
  async getUserActivityMetrics() {
    return {
      activeUsers: this.activeUsers.size,
      totalSessions: this.sessionSubsystem ? await this.sessionSubsystem.getActiveSessionCount() : 0,
      averageSessionDuration: 0,
      // Would be calculated from session data
      timestamp: new Date()
    };
  }
  async measureConnectionLatency() {
    if (!this.realtimeCommunication.isConnected) return null;
    const start = performance.now();
    return new Promise(resolve => {
      this.realtimeCommunication.socket?.emit('ping', start, response => {
        const latency = performance.now() - start;
        resolve(latency);
      });

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect() {
    this.logger.info('Disconnecting Advanced Real-time Features Subsystem');

    // Clear intervals
    if (this.presenceInterval) clearInterval(this.presenceInterval);
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.analyticsInterval) clearInterval(this.analyticsInterval);

    // Clear all data structures
    this.activeUsers.clear();
    this.collaborationRooms.clear();
    this.sharedOperations.clear();
    this.liveProgressStreams.clear();
    this.notificationQueues.clear();
    this.analyticsStreams.clear();
    this.logger.info('Advanced Real-time Features Subsystem disconnected');
  }

  /**
   * Get subsystem status
   */
  getStatus() {
    return {
      isInitialized: true,
      activeUsers: this.activeUsers.size,
      collaborationRooms: this.collaborationRooms.size,
      liveProgressStreams: this.liveProgressStreams.size,
      connectionStatus: this.realtimeCommunication.getConnectionStatus(),
      timestamp: new Date()
    };
  }
}
exports.AdvancedRealtimeSubsystem = AdvancedRealtimeSubsystem;

},{}],51:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.AuthManagementSubsystem = void 0;
/**
 * Authentication Management Subsystem
 * 
 * Handles all authentication-related operations including token management,
 * credential validation, and authentication state tracking.
 */

class AuthManagementSubsystem {
  constructor(logger, uiManager, localClient, settingsSubsystem) {
    this.logger = logger;
    this.uiManager = uiManager;
    this.localClient = localClient;
    this.settingsSubsystem = settingsSubsystem;

    // Authentication state
    this.isAuthenticated = false;
    this.tokenStatus = null;
    this.tokenExpiry = null;
    this.refreshTimer = null;
    this.logger.info('Authentication Management Subsystem initialized');
  }

  /**
   * Initialize the authentication subsystem
   */
  async init() {
    try {
      this.setupEventListeners();
      await this.checkInitialTokenStatus();
      this.setupTokenRefreshTimer();
      this.logger.info('Authentication Management Subsystem initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Authentication Management Subsystem', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for authentication-related elements
   */
  setupEventListeners() {
    // Get token button
    const getTokenBtn = document.getElementById('get-token-btn');
    if (getTokenBtn) {
      getTokenBtn.addEventListener('click', async e => {
        e.preventDefault();
        await this.getToken();
      });
    }

    // Test connection button
    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
      testConnectionBtn.addEventListener('click', async e => {
        e.preventDefault();
        await this.testConnection();
      });
    }

    // Global token refresh button
    const globalRefreshBtn = document.getElementById('global-refresh-token');
    if (globalRefreshBtn) {
      globalRefreshBtn.addEventListener('click', async e => {
        e.preventDefault();
        await this.refreshToken();
      });
    }

    // Settings form submission
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
      settingsForm.addEventListener('submit', async e => {
        e.preventDefault();
        await this.handleSettingsSubmit(e);
      });
    }
  }

  /**
   * Get a new authentication token
   */
  async getToken() {
    try {
      this.logger.info('Getting new authentication token');
      this.showTokenProgress('Getting token...');

      // Validate settings first
      await this.settingsSubsystem.loadCurrentSettings();
      const settings = this.settingsSubsystem.currentSettings;
      if (!this.validateSettings(settings)) {
        throw new Error('Invalid settings - please check your configuration');
      }

      // Request token from server
      const response = await this.localClient.post('/api/v1/auth/token', {
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        environmentId: settings.environmentId,
        region: settings.region
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to get token');
      }

      // Update token status
      this.tokenStatus = response.token;
      this.tokenExpiry = response.expiry;
      this.isAuthenticated = true;

      // Update UI
      this.updateTokenStatusUI(true, 'Token obtained successfully');
      this.uiManager.showSuccess('Authentication successful');

      // Set up refresh timer
      this.setupTokenRefreshTimer();
      this.logger.info('Token obtained successfully');
    } catch (error) {
      this.logger.error('Failed to get token', error);
      this.updateTokenStatusUI(false, error.message);
      this.uiManager.showError('Authentication Failed', error.message);
    } finally {
      this.hideTokenProgress();
    }
  }

  /**
   * Test connection with current settings
   */
  async testConnection() {
    try {
      this.logger.info('Testing connection');
      this.showConnectionProgress('Testing connection...');

      // Get current settings
      await this.settingsSubsystem.loadCurrentSettings();
      const settings = this.settingsSubsystem.currentSettings;
      if (!this.validateSettings(settings)) {
        throw new Error('Invalid settings - please check your configuration');
      }

      // Test connection
      // CRITICAL: Use GET request to match server-side endpoint
      // Server endpoint: routes/pingone-proxy-fixed.js - router.get('/test-connection')
      // Last fixed: 2025-07-21 - HTTP method mismatch caused 400 Bad Request errors
      const response = await this.localClient.get('/api/pingone/test-connection');
      if (!response.success) {
        throw new Error(response.error || 'Connection test failed');
      }

      // Update UI
      this.updateConnectionStatusUI(true, 'Connection successful');
      this.uiManager.showSuccess('Connection test successful');
      this.logger.info('Connection test successful');
    } catch (error) {
      this.logger.error('Connection test failed', error);
      this.updateConnectionStatusUI(false, error.message);
      this.uiManager.showError('Connection Test Failed', error.message);
    } finally {
      this.hideConnectionProgress();
    }
  }

  /**
   * Refresh the current token
   */
  async refreshToken() {
    try {
      this.logger.info('Refreshing authentication token');
      this.showTokenProgress('Refreshing token...');
      const response = await this.localClient.post('/api/v1/auth/refresh');
      if (!response.success) {
        throw new Error(response.error || 'Failed to refresh token');
      }

      // Update token status
      this.tokenStatus = response.token;
      this.tokenExpiry = response.expiry;
      this.isAuthenticated = true;

      // Update UI
      this.updateTokenStatusUI(true, 'Token refreshed successfully');
      this.uiManager.showSuccess('Token refreshed successfully');

      // Reset refresh timer
      this.setupTokenRefreshTimer();
      this.logger.info('Token refreshed successfully');
    } catch (error) {
      this.logger.error('Failed to refresh token', error);
      this.updateTokenStatusUI(false, error.message);
      this.uiManager.showError('Token Refresh Failed', error.message);

      // Clear authentication state
      this.clearAuthenticationState();
    } finally {
      this.hideTokenProgress();
    }
  }

  /**
   * Handle settings form submission
   */
  async handleSettingsSubmit(event) {
    try {
      const formData = new FormData(event.target);
      const settings = Object.fromEntries(formData.entries());
      this.logger.info('Saving settings');

      // Validate settings
      if (!this.validateSettings(settings)) {
        throw new Error('Invalid settings - please check all required fields');
      }

      // Save settings
      await this.settingsManager.saveSettings(settings);

      // Clear current authentication state since settings changed
      this.clearAuthenticationState();

      // Update UI
      this.uiManager.updateSettingsSaveStatus('Settings saved successfully', 'success');
      this.logger.info('Settings saved successfully');
    } catch (error) {
      this.logger.error('Failed to save settings', error);
      this.uiManager.updateSettingsSaveStatus(`Settings Save Failed: ${error.message}`, 'error');
    }
  }

  /**
   * Check initial token status and automatically acquire new token if expired
   * CRITICAL: This method provides automatic token acquisition at startup
   * DO NOT REMOVE OR MODIFY without understanding the startup authentication flow
   */
  async checkInitialTokenStatus() {
    try {
      this.logger.debug('🔍 [STARTUP] Checking initial token status...');
      const response = await this.localClient.get('/api/v1/auth/status');
      if (response.success && response.isValid) {
        // Token is valid - set authentication state
        this.tokenStatus = response.status;
        this.tokenExpiry = response.expiresIn;
        this.isAuthenticated = true;
        this.updateTokenStatusUI(true, `Token is ${response.status}`);
        this.logger.info('✅ [STARTUP] Valid token found, authentication ready');
      } else if (response.success && response.hasToken) {
        // Token exists but is expired - attempt automatic refresh
        this.logger.warn('⚠️ [STARTUP] Token expired, attempting automatic refresh...');
        this.tokenStatus = response.status;
        this.tokenExpiry = response.expiresIn;

        // Attempt automatic token acquisition
        const refreshSuccess = await this.attemptAutomaticTokenRefresh();
        if (refreshSuccess) {
          this.logger.info('✅ [STARTUP] Token automatically refreshed, authentication ready');
        } else {
          this.logger.warn('❌ [STARTUP] Automatic token refresh failed, user intervention required');
          this.isAuthenticated = false;
          this.updateTokenStatusUI(false, 'Token expired - refresh required');
        }
      } else {
        // No token available - attempt automatic acquisition if credentials exist
        this.logger.warn('⚠️ [STARTUP] No token found, attempting automatic acquisition...');
        const acquisitionSuccess = await this.attemptAutomaticTokenRefresh();
        if (acquisitionSuccess) {
          this.logger.info('✅ [STARTUP] Token automatically acquired, authentication ready');
        } else {
          this.logger.warn('❌ [STARTUP] No token available and automatic acquisition failed');
          this.isAuthenticated = false;
          this.updateTokenStatusUI(false, response.status || 'No valid token');
        }
      }
    } catch (error) {
      this.logger.error('❌ [STARTUP] Failed to check token status', error);
      this.isAuthenticated = false;
      this.updateTokenStatusUI(false, 'Token status unknown');
    }
  }

  /**
   * Attempt automatic token refresh/acquisition at startup
   * CRITICAL: This method enables automatic token acquisition when credentials are available
   * DO NOT REMOVE - Required for seamless startup authentication flow
   */
  async attemptAutomaticTokenRefresh() {
    try {
      this.logger.debug('🔄 [STARTUP] Attempting automatic token acquisition...');

      // Load current settings to check if credentials are available
      await this.settingsSubsystem.loadCurrentSettings();
      const settings = this.settingsSubsystem.currentSettings;

      // Validate that we have the required credentials
      if (!this.validateSettings(settings)) {
        this.logger.debug('❌ [STARTUP] No valid credentials available for automatic token acquisition');
        return false;
      }
      this.logger.debug('✅ [STARTUP] Valid credentials found, attempting token acquisition...');

      // Request token from server using available credentials
      const response = await this.localClient.post('/api/v1/auth/token', {
        clientId: settings.clientId,
        clientSecret: settings.clientSecret,
        environmentId: settings.environmentId,
        region: settings.region
      });
      if (response.success && response.token) {
        // Token acquisition successful - update authentication state
        this.tokenStatus = response.token;
        this.tokenExpiry = response.expiry;
        this.isAuthenticated = true;

        // Update UI to reflect successful authentication
        this.updateTokenStatusUI(true, 'Token obtained automatically');

        // Set up refresh timer for the new token
        this.setupTokenRefreshTimer();
        this.logger.info('✅ [STARTUP] Automatic token acquisition successful');
        return true;
      } else {
        this.logger.warn('❌ [STARTUP] Token acquisition failed:', response.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      this.logger.error('❌ [STARTUP] Error during automatic token acquisition:', error);
      return false;
    }
  }

  /**
   * Set up automatic token refresh timer
   * CRITICAL: This method manages token refresh scheduling
   * DO NOT REMOVE - Required for automatic token maintenance
   */
  setupTokenRefreshTimer() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    if (!this.tokenExpiry) {
      return;
    }

    // Calculate refresh time (5 minutes before expiry)
    const expiryTime = new Date(this.tokenExpiry).getTime();
    const refreshTime = expiryTime - 5 * 60 * 1000; // 5 minutes before
    const now = Date.now();
    if (refreshTime > now) {
      const delay = refreshTime - now;
      this.refreshTimer = setTimeout(() => {
        this.refreshToken();
      }, delay);
      this.logger.info('Token refresh timer set', {
        refreshIn: Math.round(delay / 1000 / 60),
        unit: 'minutes'
      });
    }
  }

  /**
   * Validate settings object
   */
  validateSettings(settings) {
    const required = ['clientId', 'clientSecret', 'environmentId', 'region'];
    for (const field of required) {
      if (!settings[field] || settings[field].trim() === '') {
        this.logger.error('Missing required setting', {
          field
        });
        return false;
      }
    }
    return true;
  }

  /**
   * Clear authentication state
   */
  clearAuthenticationState() {
    this.isAuthenticated = false;
    this.tokenStatus = null;
    this.tokenExpiry = null;
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.updateTokenStatusUI(false, 'Authentication cleared');
  }

  /**
   * Update token status UI
   */
  updateTokenStatusUI(isValid, message) {
    // Update global token status
    const globalTokenStatus = document.getElementById('global-token-status');
    if (globalTokenStatus) {
      globalTokenStatus.className = `token-status ${isValid ? 'valid' : 'invalid'}`;
      globalTokenStatus.textContent = message;
    }

    // Update token indicator
    const tokenIndicator = document.getElementById('token-status-indicator');
    if (tokenIndicator) {
      tokenIndicator.className = `token-indicator ${isValid ? 'valid' : 'invalid'}`;
    }

    // Update get token button visibility
    const getTokenBtn = document.getElementById('get-token-btn');
    if (getTokenBtn) {
      getTokenBtn.style.display = isValid ? 'none' : 'inline-block';
    }

    // Update refresh token button visibility
    const refreshTokenBtn = document.getElementById('global-refresh-token');
    if (refreshTokenBtn) {
      refreshTokenBtn.style.display = isValid ? 'inline-block' : 'none';
    }
  }

  /**
   * Update connection status UI
   */
  updateConnectionStatusUI(isConnected, message) {
    const connectionStatus = document.getElementById('connection-status');
    if (connectionStatus) {
      connectionStatus.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
      connectionStatus.textContent = message;
    }
  }

  /**
   * Show token progress
   */
  showTokenProgress(message) {
    const getTokenBtn = document.getElementById('get-token-btn');
    if (getTokenBtn) {
      getTokenBtn.disabled = true;
      getTokenBtn.textContent = message;
    }
  }

  /**
   * Hide token progress
   */
  hideTokenProgress() {
    const getTokenBtn = document.getElementById('get-token-btn');
    if (getTokenBtn) {
      getTokenBtn.disabled = false;
      getTokenBtn.textContent = 'Get Token';
    }
  }

  /**
   * Show connection progress
   */
  showConnectionProgress(message) {
    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
      testConnectionBtn.disabled = true;
      testConnectionBtn.textContent = message;
    }
  }

  /**
   * Hide connection progress
   */
  hideConnectionProgress() {
    const testConnectionBtn = document.getElementById('test-connection-btn');
    if (testConnectionBtn) {
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = 'Test Connection';
    }
  }

  /**
   * Get current authentication status
   */
  getAuthenticationStatus() {
    return {
      isAuthenticated: this.isAuthenticated,
      tokenStatus: this.tokenStatus,
      tokenExpiry: this.tokenExpiry,
      timeUntilExpiry: this.tokenExpiry ? Math.max(0, new Date(this.tokenExpiry).getTime() - Date.now()) : 0
    };
  }

  /**
   * Check if token is valid and not expired
   */
  isTokenValid() {
    if (!this.isAuthenticated || !this.tokenExpiry) {
      return false;
    }
    const now = Date.now();
    const expiry = new Date(this.tokenExpiry).getTime();
    return expiry > now;
  }
}
exports.AuthManagementSubsystem = AuthManagementSubsystem;

},{}],52:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ConnectionManagerSubsystem = void 0;
var _browserLoggingService = require("../utils/browser-logging-service.js");
/**
 * Connection Manager Subsystem
 * 
 * Manages all PingOne connection functionality including token acquisition,
 * validation, connection testing, and credential management.
 * 
 * Features:
 * - Token acquisition and validation
 * - Connection testing and health checks
 * - Credential validation and storage
 * - Connection status monitoring
 * - Automatic token refresh
 * - Connection retry logic
 */

class ConnectionManagerSubsystem {
  constructor(logger, uiManager, settingsManager, apiClient) {
    this.logger = logger || (0, _browserLoggingService.createLogger)({
      serviceName: 'connection-manager-subsystem',
      environment: 'development'
    });
    this.uiManager = uiManager;
    this.settingsManager = settingsManager;
    this.apiClient = apiClient;

    // Connection state
    this.connectionStatus = 'disconnected';
    this.lastConnectionTest = null;
    this.tokenInfo = {
      token: null,
      expiresAt: null,
      isValid: false
    };

    // Connection monitoring
    this.healthCheckInterval = null;
    this.tokenRefreshInterval = null;
    this.connectionRetryCount = 0;
    this.maxRetryAttempts = 3;

    // Event listeners
    this.eventListeners = new Map();
    this.logger.info('Connection Manager subsystem initialized');
  }

  /**
   * Initialize the connection manager subsystem
   */
  async init() {
    try {
      this.logger.info('Initializing connection manager subsystem...');

      // Load existing token if available
      await this.loadExistingToken();

      // Start connection monitoring
      this.startConnectionMonitoring();

      // Set up automatic token refresh
      this.setupTokenRefresh();
      this.logger.info('Connection Manager subsystem initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize connection manager subsystem', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Test connection to PingOne
   * @param {Object} credentials - Optional credentials to test
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    let credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    try {
      this.logger.info('Testing PingOne connection...');

      // Update UI to show testing state
      if (this.uiManager) {
        this.uiManager.updateConnectionStatus('testing', 'Testing connection...');
      }

      // Use provided credentials or get from settings
      const testCredentials = credentials || (await this.getCredentials());
      if (!testCredentials) {
        throw new Error('No credentials available for connection test');
      }

      // Validate credentials format
      this.validateCredentials(testCredentials);

      // Test connection by getting a token
      const tokenResult = await this.acquireToken(testCredentials);
      if (tokenResult.success) {
        this.connectionStatus = 'connected';
        this.lastConnectionTest = {
          timestamp: Date.now(),
          success: true,
          credentials: {
            clientId: testCredentials.clientId,
            environmentId: testCredentials.environmentId,
            region: testCredentials.region
          }
        };

        // Update UI
        if (this.uiManager) {
          this.uiManager.updateConnectionStatus('success', 'Connection successful');
        }
        this.logger.info('Connection test successful');

        // Emit connection success event
        this.emit('connectionSuccess', this.lastConnectionTest);
        return {
          success: true,
          message: 'Connection successful',
          token: tokenResult.token,
          expiresIn: tokenResult.expiresIn
        };
      } else {
        throw new Error(tokenResult.error || 'Failed to acquire token');
      }
    } catch (error) {
      this.logger.error('Connection test failed', {
        error: error.message
      });
      this.connectionStatus = 'disconnected';
      this.lastConnectionTest = {
        timestamp: Date.now(),
        success: false,
        error: error.message
      };

      // Update UI
      if (this.uiManager) {
        this.uiManager.updateConnectionStatus('error', `Connection failed: ${error.message}`);
      }

      // Emit connection failure event
      this.emit('connectionFailure', {
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Acquire a new token from PingOne
   * @param {Object} credentials - PingOne credentials
   * @returns {Promise<Object>} - Token acquisition result
   */
  async acquireToken() {
    let credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    try {
      this.logger.info('Acquiring PingOne token...');

      // Use provided credentials or get from settings
      const tokenCredentials = credentials || (await this.getCredentials());
      if (!tokenCredentials) {
        throw new Error('No credentials available for token acquisition');
      }

      // Validate credentials
      this.validateCredentials(tokenCredentials);

      // Make token request
      const response = await this.apiClient.post('/api/auth/token', {
        clientId: tokenCredentials.clientId,
        clientSecret: tokenCredentials.clientSecret,
        environmentId: tokenCredentials.environmentId,
        region: tokenCredentials.region
      });
      if (response.success && response.token) {
        // Store token info
        this.tokenInfo = {
          token: response.token,
          expiresAt: Date.now() + response.expiresIn * 1000,
          isValid: true,
          acquiredAt: Date.now()
        };

        // Update connection status
        this.connectionStatus = 'connected';

        // Update UI
        if (this.uiManager) {
          this.uiManager.updateTokenStatus(true, 'Token acquired successfully');
        }
        this.logger.info('Token acquired successfully', {
          expiresIn: response.expiresIn
        });

        // Emit token acquired event
        this.emit('tokenAcquired', {
          token: response.token,
          expiresIn: response.expiresIn
        });
        return {
          success: true,
          token: response.token,
          expiresIn: response.expiresIn
        };
      } else {
        throw new Error(response.error || 'Failed to acquire token');
      }
    } catch (error) {
      this.logger.error('Token acquisition failed', {
        error: error.message
      });

      // Clear token info
      this.tokenInfo = {
        token: null,
        expiresAt: null,
        isValid: false
      };

      // Update connection status
      this.connectionStatus = 'disconnected';

      // Update UI
      if (this.uiManager) {
        this.uiManager.updateTokenStatus(false, `Token acquisition failed: ${error.message}`);
      }

      // Emit token acquisition failure event
      this.emit('tokenAcquisitionFailure', {
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Validate current token
   * @returns {Promise<boolean>} - Whether token is valid
   */
  async validateToken() {
    try {
      if (!this.tokenInfo.token) {
        this.logger.debug('No token to validate');
        return false;
      }

      // Check if token is expired
      if (this.tokenInfo.expiresAt && Date.now() >= this.tokenInfo.expiresAt) {
        this.logger.info('Token has expired');
        this.tokenInfo.isValid = false;
        return false;
      }

      // Test token with a simple API call
      const response = await this.apiClient.get('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${this.tokenInfo.token}`
        }
      });
      const isValid = response.success;
      this.tokenInfo.isValid = isValid;
      if (isValid) {
        this.logger.debug('Token validation successful');
        this.connectionStatus = 'connected';
      } else {
        this.logger.info('Token validation failed');
        this.connectionStatus = 'disconnected';
      }
      return isValid;
    } catch (error) {
      this.logger.error('Token validation error', {
        error: error.message
      });
      this.tokenInfo.isValid = false;
      this.connectionStatus = 'disconnected';
      return false;
    }
  }

  /**
   * Refresh current token
   * @returns {Promise<Object>} - Token refresh result
   */
  async refreshToken() {
    try {
      this.logger.info('Refreshing token...');

      // Get current credentials
      const credentials = await this.getCredentials();
      if (!credentials) {
        throw new Error('No credentials available for token refresh');
      }

      // Acquire new token
      const result = await this.acquireToken(credentials);
      if (result.success) {
        this.logger.info('Token refreshed successfully');

        // Emit token refreshed event
        this.emit('tokenRefreshed', {
          token: result.token,
          expiresIn: result.expiresIn
        });
      }
      return result;
    } catch (error) {
      this.logger.error('Token refresh failed', {
        error: error.message
      });

      // Emit token refresh failure event
      this.emit('tokenRefreshFailure', {
        error: error.message
      });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current credentials
   * @returns {Promise<Object|null>} - Current credentials
   */
  async getCredentials() {
    try {
      // Try to get from credentials manager first
      if (window.credentialsManager) {
        const credentials = window.credentialsManager.getCredentials();
        if (credentials && this.isValidCredentialSet(credentials)) {
          return credentials;
        }
      }

      // Fallback to settings manager
      if (this.settingsManager) {
        await this.settingsManager.loadCurrentSettings();
        const settings = this.settingsManager.currentSettings;
        if (settings && this.isValidCredentialSet(settings)) {
          return {
            clientId: settings.clientId,
            clientSecret: settings.clientSecret,
            environmentId: settings.environmentId,
            region: settings.region
          };
        }
      }
      return null;
    } catch (error) {
      this.logger.error('Failed to get credentials', {
        error: error.message
      });
      return null;
    }
  }

  /**
   * Validate credentials format
   * @param {Object} credentials - Credentials to validate
   */
  validateCredentials(credentials) {
    const required = ['clientId', 'clientSecret', 'environmentId'];
    const missing = required.filter(field => !credentials[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required credentials: ${missing.join(', ')}`);
    }

    // Validate format
    if (!/^[a-f0-9-]{36}$/.test(credentials.clientId)) {
      throw new Error('Invalid client ID format');
    }
    if (!/^[a-f0-9-]{36}$/.test(credentials.environmentId)) {
      throw new Error('Invalid environment ID format');
    }
    if (credentials.clientSecret.length < 10) {
      throw new Error('Client secret appears to be invalid');
    }
  }

  /**
   * Check if credential set is valid
   * @param {Object} credentials - Credentials to check
   * @returns {boolean} - Whether credentials are valid
   */
  isValidCredentialSet(credentials) {
    try {
      this.validateCredentials(credentials);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load existing token from storage
   */
  async loadExistingToken() {
    try {
      // Try to load from token manager
      if (window.globalTokenManager && typeof window.globalTokenManager.getCachedToken === 'function') {
        const cachedToken = window.globalTokenManager.getCachedToken();
        if (cachedToken) {
          this.tokenInfo = {
            token: cachedToken.token,
            expiresAt: cachedToken.expiresAt,
            isValid: cachedToken.isValid,
            acquiredAt: cachedToken.acquiredAt
          };

          // Validate the loaded token
          const isValid = await this.validateToken();
          if (isValid) {
            this.connectionStatus = 'connected';
            this.logger.info('Existing token loaded and validated');
          } else {
            this.logger.info('Existing token loaded but invalid');
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to load existing token', {
        error: error.message
      });
    }
  }

  /**
   * Start connection monitoring
   */
  startConnectionMonitoring() {
    // Health check every 5 minutes
    this.healthCheckInterval = setInterval(async () => {
      if (this.connectionStatus === 'connected') {
        const isValid = await this.validateToken();
        if (!isValid) {
          this.logger.info('Connection lost during health check');
          this.emit('connectionLost');
        }
      }
    }, 5 * 60 * 1000);
    this.logger.debug('Connection monitoring started');
  }

  /**
   * Setup automatic token refresh
   */
  setupTokenRefresh() {
    // Check token expiry every minute
    this.tokenRefreshInterval = setInterval(async () => {
      if (this.tokenInfo.token && this.tokenInfo.expiresAt) {
        const timeUntilExpiry = this.tokenInfo.expiresAt - Date.now();
        const refreshThreshold = 5 * 60 * 1000; // 5 minutes

        if (timeUntilExpiry <= refreshThreshold && timeUntilExpiry > 0) {
          this.logger.info('Token expiring soon, attempting refresh...');
          await this.refreshToken();
        }
      }
    }, 60 * 1000);
    this.logger.debug('Automatic token refresh setup');
  }

  /**
   * Get connection status
   * @returns {string} - Current connection status
   */
  getConnectionStatus() {
    return this.connectionStatus;
  }

  /**
   * Get token info
   * @returns {Object} - Current token information
   */
  getTokenInfo() {
    return {
      hasToken: !!this.tokenInfo.token,
      isValid: this.tokenInfo.isValid,
      expiresAt: this.tokenInfo.expiresAt,
      timeUntilExpiry: this.tokenInfo.expiresAt ? this.tokenInfo.expiresAt - Date.now() : null
    };
  }

  /**
   * Get last connection test result
   * @returns {Object|null} - Last connection test result
   */
  getLastConnectionTest() {
    return this.lastConnectionTest;
  }

  /**
   * Check if currently connected
   * @returns {boolean} - Whether currently connected
   */
  isConnected() {
    return this.connectionStatus === 'connected' && this.tokenInfo.isValid;
  }

  /**
   * Check if token is valid and not expired
   * @returns {boolean} - Whether token is valid
   */
  hasValidToken() {
    return this.tokenInfo.isValid && this.tokenInfo.token && this.tokenInfo.expiresAt && Date.now() < this.tokenInfo.expiresAt;
  }

  /**
   * Disconnect and clear token
   */
  disconnect() {
    this.logger.info('Disconnecting...');

    // Clear token info
    this.tokenInfo = {
      token: null,
      expiresAt: null,
      isValid: false
    };

    // Update connection status
    this.connectionStatus = 'disconnected';

    // Update UI
    if (this.uiManager) {
      this.uiManager.updateConnectionStatus('disconnected', 'Disconnected');
      this.uiManager.updateTokenStatus(false, 'No token');
    }

    // Emit disconnected event
    this.emit('disconnected');
    this.logger.info('Disconnected successfully');
  }

  /**
   * Add event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener function
   */
  off(event, listener) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          this.logger.error('Event listener error', {
            event,
            error: error.message
          });
        }
      });
    }
  }

  /**
   * Get connection statistics
   * @returns {Object} - Connection statistics
   */
  getConnectionStats() {
    return {
      status: this.connectionStatus,
      hasToken: !!this.tokenInfo.token,
      tokenValid: this.tokenInfo.isValid,
      tokenExpiresAt: this.tokenInfo.expiresAt,
      lastConnectionTest: this.lastConnectionTest,
      retryCount: this.connectionRetryCount
    };
  }

  /**
   * Clean up the connection manager subsystem
   */
  cleanup() {
    // Clear intervals
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }

    // Clear event listeners
    this.eventListeners.clear();

    // Disconnect
    this.disconnect();
    this.logger.info('Connection Manager subsystem cleaned up');
  }
}
exports.ConnectionManagerSubsystem = ConnectionManagerSubsystem;

},{"../utils/browser-logging-service.js":60}],53:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * @file Manages the operation history for the application.
 */

class HistorySubsystem {
  /**
   * @param {Logger} logger A logger instance.
   * @param {LocalApiClient} localClient An API client for making requests.
   * @param {UIManager} uiManager The UI manager for updating the view.
   * @param {EventBus} eventBus For listening to application-wide events.
   */
  constructor(logger, localClient, uiManager, eventBus) {
    if (!logger || !localClient || !uiManager || !eventBus) {
      throw new Error('HistorySubsystem: logger, localClient, uiManager, and eventBus are required.');
    }
    this.logger = logger.child({
      subsystem: 'HistorySubsystem'
    });
    this.localClient = localClient;
    this.uiManager = uiManager;
    this.eventBus = eventBus;
    this.history = [];
    this.logger.info('HistorySubsystem initialized.');
  }

  /**
   * Initializes the subsystem.
   */
  async init() {
    this.logger.info('Initializing...');
    this.eventBus.on('operation-completed', () => this.fetchHistory(true));
    await this.fetchHistory();
    this.logger.info('Successfully initialized.');
  }

  /**
   * Fetches operation history from the server.
   * @param {boolean} forceRefresh Whether to force a refresh.
   * @returns {Promise<Array>}
   */
  async fetchHistory() {
    let forceRefresh = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    if (this.history.length > 0 && !forceRefresh) {
      return this.history;
    }
    this.logger.info('Fetching operation history...');
    try {
      const data = await this.localClient.get('/history');
      this.history = data.history || [];
      this.logger.info(`Successfully fetched ${this.history.length} history records.`);
      this.renderHistory();
      return this.history;
    } catch (error) {
      this.logger.error('Failed to fetch history:', error);
      this.uiManager.showError('Could not load operation history.');
      return [];
    }
  }

  /**
   * Renders the history data into the UI.
   */
  renderHistory() {
    this.logger.debug('Rendering history view...');
    const historyView = document.getElementById('history-view');
    if (!historyView) {
      this.logger.warn('History view element not found.');
      return;
    }

    // This is a placeholder for the actual rendering logic.
    // A more robust implementation would use the UIManager to create and update elements.
    historyView.innerHTML = `<pre>${JSON.stringify(this.history, null, 2)}</pre>`;
    this.logger.debug('History view rendered.');
  }
}
var _default = exports.default = HistorySubsystem;

},{}],54:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ImportSubsystem = void 0;
/**
 * Import Management Subsystem
 * 
 * Handles all user import operations with proper separation of concerns.
 * Manages file validation, progress tracking, real-time updates, and error handling.
 */

class ImportSubsystem {
  constructor(logger, uiManager, localClient, settingsManager, eventBus, populationService) {
    let authManagementSubsystem = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : null;
    this.logger = logger;
    this.uiManager = uiManager;
    this.localClient = localClient;
    this.settingsManager = settingsManager;
    this.eventBus = eventBus;
    this.populationService = populationService;
    this.authManagementSubsystem = authManagementSubsystem;

    // Import state management
    this.isImporting = false;
    this.socket = null;
    this.selectedPopulationId = null;
    this.selectedPopulationName = null;
    this.fallbackPolling = null;
    this.selectedFile = null; // Tracks the selected file for import

    // Initialize message formatter with a fallback
    this.messageFormatter = window.messageFormatter || {
      formatMessage: (type, message) => `[${type.toUpperCase()}] ${message}`
    };
    this.logger.info('Import Subsystem initialized');

    // Set up event listeners for cross-subsystem communication
    this.setupCrossSubsystemEvents();
  }

  /**
   * Initialize the import subsystem
   */
  async init() {
    (this.logger?.debug || window.logger?.debug || console.log)('🚀 [DEBUG] ImportSubsystem: init() method called');
    try {
      (this.logger?.debug || window.logger?.debug || console.log)('🔧 [DEBUG] ImportSubsystem: Setting up event listeners');
      this.setupEventListeners();
      (this.logger?.debug || window.logger?.debug || console.log)('📋 [DEBUG] ImportSubsystem: About to refresh population dropdown');
      // Initialize population dropdown
      this.refreshPopulationDropdown();
      (this.logger?.debug || window.logger?.debug || console.log)('🔘 [DEBUG] ImportSubsystem: Setting initial button state');
      // Set initial button state (should be disabled until form is complete)
      this.validateAndUpdateButtonState();
      (this.logger?.debug || window.logger?.debug || console.log)('✅ [DEBUG] ImportSubsystem: Init completed successfully');
      (this.logger?.info || window.logger?.info || console.log)('Import Subsystem initialized successfully');
    } catch (error) {
      (this.logger?.error || window.logger?.error || console.error)('❌ [DEBUG] ImportSubsystem: Init failed with error:', error);
      (this.logger?.error || window.logger?.error || console.error)('Failed to initialize Import Subsystem', error);
      throw error;
    }
  }

  /**
   * Set up event listeners for import-related elements
   */
  setupEventListeners() {
    // Initialize utilities for safe DOM operations
    const safeDOM = window.safeDOM || new SafeDOM(this.logger);
    const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
    const UI_CONFIG = window.UI_CONFIG || {
      SELECTORS: {
        START_IMPORT_BTN: 'start-import',
        CSV_FILE_INPUT: 'csv-file',
        IMPORT_POPULATION_SELECT: 'import-population-select'
      }
    };

    // Import button (correct ID is 'start-import') with Safe DOM
    const importBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.START_IMPORT_BTN);
    if (importBtn) {
      safeDOM.addEventListener(importBtn, 'click', errorHandler.wrapAsyncEventHandler(async e => {
        e.preventDefault();
        await this.startImport();
      }, 'Import button click handler'));
    }

    // CSV file input with Safe DOM
    const csvFileInput = safeDOM.selectById(UI_CONFIG.SELECTORS.CSV_FILE_INPUT);
    if (csvFileInput) {
      safeDOM.addEventListener(csvFileInput, 'change', errorHandler.wrapAsyncEventHandler(async e => {
        const file = e.target.files[0];
        if (file) {
          this.selectedFile = file; // Update the selected file
          await this.handleFileSelect(file);
          this.validateAndUpdateButtonState();
        }
      }, 'CSV file input change handler'));
    }

    // Population dropdown change with Safe DOM
    const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.IMPORT_POPULATION_SELECT);
    if (populationSelect) {
      safeDOM.addEventListener(populationSelect, 'change', errorHandler.wrapEventHandler(e => {
        this.handlePopulationChange(e.target.value, e.target.selectedOptions[0]?.text);
        this.validateAndUpdateButtonState();
      }, 'Population dropdown change handler'));
    }

    // Drag & Drop functionality
    this.setupDragAndDropListeners();
  }

  /**
   * Set up drag and drop event listeners for CSV file upload
   */
  setupDragAndDropListeners() {
    const dropArea = document.getElementById('import-drop-zone');
    const fileInput = document.getElementById('csv-file');
    if (!dropArea) {
      this.logger.warn('Import drop zone not found in DOM');
      return;
    }

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('drag-over');
      }, false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('drag-over');
      }, false);
    });

    // Handle dropped files
    dropArea.addEventListener('drop', async e => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        const file = files[0];
        this.selectedFile = file; // Update the selected file

        // Update the file input to reflect the dropped file
        if (fileInput) {
          // Create a new FileList-like object
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;
        }
        await this.handleFileSelect(file);
        this.validateAndUpdateButtonState();
      }
    }, false);

    // Handle click to browse files
    dropArea.addEventListener('click', () => {
      if (fileInput) {
        fileInput.click();
      }
    });
    this.logger.info('Drag and drop listeners set up successfully');
  }

  /**
   * Start the import process
   */
  async startImport() {
    this.logger.info('🚀 [DEBUG] ImportSubsystem: Start import button clicked');
    if (this.isImporting) {
      this.logger.warn('🚀 [DEBUG] ImportSubsystem: Import already in progress');
      this.uiManager.showNotification('An import is already in progress. Please wait for it to complete.', {
        type: 'warning',
        duration: 5000,
        title: 'Import In Progress'
      });
      return;
    }
    try {
      this.isImporting = true;
      this.logger.info('🚀 [DEBUG] ImportSubsystem: Starting import process');

      // Validate prerequisites
      this.logger.debug('🚀 [DEBUG] ImportSubsystem: Validating prerequisites...');
      if (!(await this.validateImportPrerequisites())) {
        this.logger.warn('🚀 [DEBUG] ImportSubsystem: Prerequisites validation failed, aborting import');
        return;
      }
      this.logger.info('🚀 [DEBUG] ImportSubsystem: Prerequisites validated, proceeding with import');

      // Get population selection
      this.getPopulationSelection();

      // Show progress UI
      this.logger.debug('🚀 [DEBUG] ImportSubsystem: Showing progress UI');
      this.uiManager.showProgress();

      // Start real-time connection
      const sessionId = this.generateSessionId();
      this.logger.debug('🚀 [DEBUG] ImportSubsystem: Establishing real-time connection with session:', sessionId);
      await this.establishRealTimeConnection(sessionId);

      // Begin import process
      this.logger.debug('🚀 [DEBUG] ImportSubsystem: Executing import with session:', sessionId);
      await this.executeImport(sessionId);
    } catch (error) {
      this.logger.error('🚀 [DEBUG] ImportSubsystem: Import process failed', error);
      this.uiManager.showError('Import Failed', error.message || 'An unexpected error occurred during the import process.');
    } finally {
      this.isImporting = false;
      this.logger.debug('🚀 [DEBUG] ImportSubsystem: Import process completed, resetting isImporting flag');
    }
  }

  /**
   * Validate import prerequisites
   */
  async validateImportPrerequisites() {
    this.logger.debug('🔍 [DEBUG] ImportSubsystem: Validating import prerequisites');

    // Check for valid token
    const hasValidToken = await this.checkTokenStatus();
    if (!hasValidToken) {
      this.logger.warn('🔍 [DEBUG] ImportSubsystem: Token validation failed');
      // Show user-friendly authentication modal with "Go to Settings" button
      this.showAuthenticationModal('Import');
      return false;
    }

    // Check file selection using the internal selectedFile property
    if (!this.selectedFile) {
      this.logger.warn('🔍 [DEBUG] ImportSubsystem: No file selected (selectedFile is null)');
      this.uiManager.showError('No File Selected', 'Please select a CSV file to import.');
      return false;
    }

    // Check population selection
    const populationSelect = document.getElementById('import-population-select');
    if (!populationSelect || !populationSelect.value || populationSelect.value === '') {
      this.logger.warn('🔍 [DEBUG] ImportSubsystem: No population selected');
      this.uiManager.showError('No Population Selected', 'Please select a population for the import.');
      return false;
    }
    this.logger.info('✅ [DEBUG] ImportSubsystem: All prerequisites validated successfully', {
      hasFile: !!this.selectedFile,
      fileName: this.selectedFile?.name,
      hasPopulation: !!populationSelect?.value,
      populationId: populationSelect?.value
    });
    return true;
  }

  /**
   * Get current population selection
   */
  getPopulationSelection() {
    const popSelect = document.getElementById('import-population-select');
    this.selectedPopulationId = popSelect?.value || '';
    if (popSelect) {
      const selectedOption = popSelect.options[popSelect.selectedIndex];
      this.selectedPopulationName = selectedOption?.text || '';
    }
    this.logger.info('Population selection', {
      id: this.selectedPopulationId,
      name: this.selectedPopulationName
    });
  }

  /**
   * Handle progress updates
   */
  handleProgressUpdate(data) {
    if (!data || data.current === undefined || data.total === undefined) {
      this.logger.error('Invalid progress data', data);
      return;
    }
    const percentage = Math.round(data.current / data.total * 100);

    // Update progress UI
    this.uiManager.updateProgress(percentage, data.message || `Processing ${data.current} of ${data.total} users...`);
    this.logger.info('Progress update', {
      current: data.current,
      total: data.total,
      percentage
    });
  }

  /**
   * Handle import completion
   */
  handleImportCompletion(data) {
    this.logger.info('Import completed', data);
    // TODO: Refactor: Use Notification from UI subsystem instead of alert.
    this.cleanupConnections();
  }

  /**
   * Handle import errors
   */
  handleImportError(data) {
    this.logger.error('Import error', data);
    // TODO: Refactor: Use Notification or Modal from UI subsystem instead of alert.
    this.cleanupConnections();
  }

  /**
   * Execute the import process
   */
  async executeImport(sessionId) {
    const fileInput = document.getElementById('csv-file');
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('populationId', this.selectedPopulationId);
    formData.append('sessionId', sessionId);
    try {
      const response = await this.localClient.post('/api/import', formData);
      if (!response.success) {
        throw new Error(response.error || 'Import failed');
      }
      this.logger.info('Import request sent successfully');
    } catch (error) {
      this.logger.error('Import request failed', error);
      throw error;
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check token status
   */
  async checkTokenStatus() {
    try {
      (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: checkTokenStatus called');
      (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: this.authManagementSubsystem =', this.authManagementSubsystem);
      (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: typeof this.authManagementSubsystem =', typeof this.authManagementSubsystem);
      if (!this.authManagementSubsystem) {
        this.logger.warn('AuthManagementSubsystem not available for token check');
        (this.logger?.debug || window.logger?.debug || console.log)('❌ [DEBUG] ImportSubsystem: AuthManagementSubsystem is null/undefined');
        return false;
      }
      (this.logger?.debug || window.logger?.debug || console.log)('✅ [DEBUG] ImportSubsystem: AuthManagementSubsystem is available, calling isTokenValid()');
      const isValid = this.authManagementSubsystem.isTokenValid();
      (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: isValid =', isValid);

      // Also get authentication status for additional info
      const authStatus = this.authManagementSubsystem.getAuthenticationStatus();
      (this.logger?.debug || window.logger?.debug || console.log)('🔍 [DEBUG] ImportSubsystem: authStatus =', authStatus);
      return isValid;
    } catch (error) {
      this.logger.error('Error checking token status:', error);
      (this.logger?.debug || window.logger?.debug || console.log)('❌ [DEBUG] ImportSubsystem: Error in checkTokenStatus:', error);
      return false;
    }
  }

  /**
   * Show authentication modal with "Go to Settings" button
   */
  showAuthenticationModal() {
    let operation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'Import';
    try {
      // Create authentication modal directly to avoid bundling issues
      this.createAuthenticationModal(operation);
    } catch (error) {
      this.logger.error('Error showing authentication modal:', error);
      // Fallback to generic error
      this.uiManager.showError('Authentication Required', `You must have a valid token to start an ${operation.toLowerCase()}. Please go to Settings to configure your credentials.`);
    }
  }

  /**
   * Create authentication modal with "Go to Settings" button
   */
  createAuthenticationModal(operation) {
    // Initialize utilities for safe DOM operations
    const safeDOM = window.safeDOM || new SafeDOM(this.logger);
    const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
    const UI_CONFIG = window.UI_CONFIG || {
      SELECTORS: {
        TOKEN_ALERT_OVERLAY: '.token-alert-overlay',
        SETTINGS_NAV_ITEM: '[data-view="settings"]'
      },
      CLASSES: {
        TOKEN_ALERT_OVERLAY: 'token-alert-overlay'
      }
    };

    // Check if modal already exists using Safe DOM
    const existingModal = safeDOM.select(UI_CONFIG.SELECTORS.TOKEN_ALERT_OVERLAY);
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay using Safe DOM
    const overlay = document.createElement('div');
    safeDOM.addClass(overlay, UI_CONFIG.CLASSES.TOKEN_ALERT_OVERLAY);
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'token-alert-title');
    overlay.setAttribute('aria-describedby', 'token-alert-content');

    // Modal content with enhanced styling and action button
    overlay.innerHTML = `
            <div class="token-alert-modal" tabindex="-1">
                <div class="token-alert-header">
                    <h2 id="token-alert-title">
                        <span class="warning-icon" aria-hidden="true">⚠️</span>
                        <span>Authentication Required</span>
                    </h2>
                    <button type="button" class="token-alert-close" id="token-alert-close" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="token-alert-body">
                    <div id="token-alert-content" class="token-alert-content">
                        <div class="token-alert-icon">
                            <span aria-hidden="true">🔐</span>
                        </div>
                        <h3>No Valid Token Available</h3>
                        <p class="token-alert-message">
                            <strong>Authentication is required to continue.</strong>
                            You need valid credentials to perform the "${operation}" operation.
                        </p>
                        <div class="token-status-info">
                            <p><strong>Current Status:</strong> No token available</p>
                        </div>
                        <div class="token-alert-actions">
                            <button type="button" class="btn btn-primary btn-lg" id="token-alert-settings-btn">
                                <span class="btn-icon">⚙️</span>
                                Go to Settings
                            </button>
                            <p class="token-alert-help">
                                Add your PingOne credentials in the Settings page to generate a new token.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(overlay);

    // Bind events using Safe DOM
    const settingsBtn = safeDOM.select('#token-alert-settings-btn', overlay);
    const closeBtn = safeDOM.select('#token-alert-close', overlay);

    // Settings button - navigate to settings with error handling
    if (settingsBtn) {
      safeDOM.addEventListener(settingsBtn, 'click', errorHandler.wrapEventHandler(() => {
        overlay.remove();
        // Navigate to settings view
        if (window.app && window.app.showView) {
          window.app.showView('settings');
        } else {
          // Fallback: trigger the settings nav item using Safe DOM
          const settingsNavItem = safeDOM.select(UI_CONFIG.SELECTORS.SETTINGS_NAV_ITEM);
          if (settingsNavItem) {
            settingsNavItem.click();
          } else {
            // Final fallback: redirect to home page
            window.location.href = '/';
          }
        }
      }, 'Authentication modal settings button click'));
    }

    // Close button - allow manual dismissal
    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });

    // Trap focus within modal
    overlay.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        overlay.remove();
      }
    });

    // Show modal with animation
    overlay.style.display = 'flex';
    setTimeout(() => {
      overlay.classList.add('show');
    }, 10);
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(file) {
    try {
      this.logger.info('File selected for import', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Validate file
      if (!this.validateFile(file)) {
        return;
      }

      // Show file info
      this.displayFileInfo(file);
    } catch (error) {
      this.logger.error('File selection failed', error);
      this.uiManager.showError('File Selection Error', error.message);
    }
  }

  /**
   * Validate form state and update Import button enabled/disabled state
   */
  validateAndUpdateButtonState() {
    // Initialize utilities for safe DOM operations
    const safeDOM = window.safeDOM || new SafeDOM(this.logger);
    const errorHandler = window.errorHandler || new ErrorHandler(this.logger);
    const UI_CONFIG = window.UI_CONFIG || {
      SELECTORS: {
        START_IMPORT_BTN: 'start-import',
        IMPORT_POPULATION_SELECT: 'import-population-select'
      },
      CLASSES: {
        BTN_DISABLED: 'btn-disabled',
        BTN_PRIMARY: 'btn-primary'
      }
    };

    // Wrap the entire validation in error handler
    errorHandler.wrapSync(() => {
      const importBtn = safeDOM.selectById(UI_CONFIG.SELECTORS.START_IMPORT_BTN);
      if (!importBtn) {
        this.logger.warn('Import button not found for state validation');
        return;
      }

      // Check if file is selected (using internal state for reliability)
      const hasFile = !!this.selectedFile;

      // Check if population is selected using Safe DOM
      const populationSelect = safeDOM.selectById(UI_CONFIG.SELECTORS.IMPORT_POPULATION_SELECT);
      const hasPopulation = populationSelect && populationSelect.value && populationSelect.value !== '';

      // Enable button only if both file and population are selected
      const shouldEnable = hasFile && hasPopulation;
      importBtn.disabled = !shouldEnable;
      this.logger.debug('Import button state updated', {
        hasFile,
        hasPopulation,
        shouldEnable,
        buttonDisabled: importBtn.disabled
      });

      // Update button appearance using Safe DOM
      if (shouldEnable) {
        safeDOM.removeClass(importBtn, UI_CONFIG.CLASSES.BTN_DISABLED);
        safeDOM.addClass(importBtn, UI_CONFIG.CLASSES.BTN_PRIMARY);
      } else {
        safeDOM.addClass(importBtn, UI_CONFIG.CLASSES.BTN_DISABLED);
        safeDOM.removeClass(importBtn, UI_CONFIG.CLASSES.BTN_PRIMARY);
      }
    }, 'Import button state validation')();
  }

  /**
   * Validate selected file
   */
  validateFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.uiManager.showError('Invalid File Type', 'Please select a CSV file');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      this.uiManager.showError('File Too Large', 'File size must be less than 10MB');
      return false;
    }
    return true;
  }

  /**
   * Display comprehensive file information with record count and validation
   * CRITICAL: This method provides detailed file information display for CSV import UI
   * DO NOT simplify this method - users need comprehensive file details including record counts
   * Last enhanced: 2025-07-22 - Restored missing file information section functionality
   */
  async displayFileInfo(file) {
    try {
      this.logger.info('Displaying comprehensive file information', {
        fileName: file.name
      });

      // Parse CSV to get record count and validation information
      let recordCount = null;
      let csvData = null;
      try {
        // Read and parse the CSV file to get accurate record count
        const fileContent = await this.readFileAsText(file);
        csvData = this.parseCSVContent(fileContent);
        recordCount = csvData ? csvData.length : 0;
        this.logger.debug('CSV parsing completed', {
          recordCount,
          hasData: !!csvData
        });
      } catch (parseError) {
        this.logger.warn('Failed to parse CSV for record count', {
          error: parseError.message
        });
        recordCount = 'Unable to determine';
      }

      // Use comprehensive file info display with all details
      this.updateFileInfoDisplay(file, recordCount, csvData);
    } catch (error) {
      this.logger.error('Failed to display file information', {
        error: error.message
      });

      // Initialize utilities for safe DOM operations
      const safeDOM = window.safeDOM || new SafeDOM(this.logger);
      const UI_CONFIG = window.UI_CONFIG || {
        SELECTORS: {
          FILE_INFO: 'file-info'
        },
        CLASSES: {
          FILE_INFO_ERROR: 'file-info-error'
        },
        STYLES: {
          ERROR_BACKGROUND: '#f8d7da',
          ERROR_BORDER: '1px solid #f5c6cb',
          ERROR_COLOR: '#721c24'
        }
      };

      // Fallback to basic file info display using Safe DOM
      const fileInfoElement = safeDOM.selectById(UI_CONFIG.SELECTORS.FILE_INFO);
      if (fileInfoElement) {
        const errorHTML = `
                    <div class="${UI_CONFIG.CLASSES.FILE_INFO_ERROR}" style="background: ${UI_CONFIG.STYLES.ERROR_BACKGROUND}; border: ${UI_CONFIG.STYLES.ERROR_BORDER}; border-radius: 4px; padding: 12px; color: ${UI_CONFIG.STYLES.ERROR_COLOR};">
                        <strong>⚠️ File Information Error</strong><br>
                        Selected: ${file.name}<br>
                        Size: ${(file.size / 1024).toFixed(2)} KB<br>
                        <em>Unable to display detailed information: ${error.message}</em>
                    </div>
                `;
        safeDOM.setHTML(fileInfoElement, errorHTML);
      }
    }
  }

  /**
   * Read file as text for CSV parsing
   * @param {File} file - The file to read
   * @returns {Promise<string>} File content as text
   */
  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => resolve(event.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * Parse CSV content to extract user records
   * @param {string} content - CSV file content
   * @returns {Array} Parsed CSV records
   */
  parseCSVContent(content) {
    if (!content || typeof content !== 'string') {
      return [];
    }
    try {
      // Simple CSV parsing - split by lines and handle basic CSV format
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      if (lines.length <= 1) {
        return []; // No data rows (only header or empty)
      }

      // Return data rows (excluding header)
      return lines.slice(1).map(line => {
        // Basic CSV parsing - split by comma and handle quoted fields
        const fields = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        fields.push(current.trim()); // Add the last field

        return fields;
      }).filter(row => row.some(field => field.length > 0)); // Filter out empty rows
    } catch (error) {
      this.logger.error('CSV parsing error', {
        error: error.message
      });
      return [];
    }
  }

  /**
   * Update file info display with comprehensive information
   * @param {File} file - The selected file
   * @param {number|string} recordCount - Number of records or error message
   * @param {Array} csvData - Parsed CSV data for validation
   */
  updateFileInfoDisplay(file, recordCount, csvData) {
    const fileInfoElement = document.getElementById('file-info');
    if (!fileInfoElement) {
      this.logger.warn('File info element not found in DOM');
      return;
    }
    const fileSize = this.formatFileSize(file.size);
    const lastModified = new Date(file.lastModified).toLocaleString();
    const fileType = file.type || this.getFileExtension(file.name);
    const fileExtension = this.getFileExtension(file.name);

    // Determine if file type is valid for CSV import
    const isCSV = fileExtension === 'csv';
    const isText = fileExtension === 'txt';
    const isValidType = isCSV || isText || fileType === 'text/csv' || fileType === 'text/plain';

    // Create record count display
    let recordCountHTML = '';
    if (isValidType && recordCount !== null) {
      if (typeof recordCount === 'number') {
        if (recordCount > 0) {
          recordCountHTML = `
                        <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                            <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong>
                            <span style="color: #0073C8; font-size: 0.8rem; font-weight: bold;">${recordCount}</span>
                        </div>
                    `;
        } else {
          recordCountHTML = `
                        <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                            <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong>
                            <span style="color: #dc3545; font-size: 0.8rem; font-weight: bold;">No user records found</span>
                        </div>
                    `;
        }
      } else {
        recordCountHTML = `
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">🧾 Records</strong>
                        <span style="color: #ffc107; font-size: 0.8rem; font-weight: bold;">${recordCount}</span>
                    </div>
                `;
      }
    }

    // Create comprehensive file information display
    const fileInfoHTML = `
            <div class="file-info-details" style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 12px; margin: 8px 0; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
                
                <!-- File Name Section -->
                <div class="file-name-section" style="text-align: center; margin-bottom: 12px; padding: 8px; background: #e6f4ff; border-radius: 4px; color: #1a237e; font-weight: bold; font-size: 1.1rem;">
                    <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 3px; color: #1a237e; word-break: break-word; overflow-wrap: break-word;">
                        <i class="fas fa-file-csv" style="margin-right: 6px; font-size: 1.2rem; color: #1976d2;"></i>
                        ${file.name}
                    </div>
                    <div style="font-size: 0.85rem; opacity: 0.9; font-weight: 500; color: #1976d2;">
                        File Selected Successfully
                    </div>
                </div>
                
                <!-- File Information Grid -->
                <div class="file-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.8em; margin-bottom: 10px;">
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📊 File Size</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${fileSize}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📅 Modified</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${lastModified}</span>
                    </div>
                    
                    <div class="file-info-item" style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                        <strong style="color: #495057; display: block; margin-bottom: 3px; font-size: 0.85rem;">📄 Type</strong>
                        <span style="color: #6c757d; font-size: 0.8rem;">${fileType || 'CSV'}</span>
                    </div>
                    
                    ${recordCountHTML}
                </div>
                
                <!-- File Status -->
                <div class="file-info-status" style="margin-top: 8px; padding: 8px; border-radius: 4px; background: ${isValidType ? '#d4edda' : '#f8d7da'}; border: 1px solid ${isValidType ? '#c3e6cb' : '#f5c6cb'}; display: flex; align-items: center; gap: 6px;">
                    <i class="fas ${isValidType ? 'fa-check-circle' : 'fa-exclamation-triangle'}" style="color: ${isValidType ? '#155724' : '#721c24'};"></i>
                    <span style="color: ${isValidType ? '#155724' : '#721c24'}; font-size: 0.85rem; font-weight: 500;">
                        ${isValidType ? 'Valid CSV file format' : 'Warning: File type may not be compatible'}
                    </span>
                </div>
                
                ${csvData && csvData.length > 0 ? `
                <div class="file-info-preview" style="margin-top: 8px; padding: 8px; border-radius: 4px; background: #fff3cd; border: 1px solid #ffeaa7;">
                    <strong style="color: #856404; font-size: 0.85rem;">📋 Ready for Import</strong>
                    <div style="color: #856404; font-size: 0.8rem; margin-top: 2px;">
                        File contains ${recordCount} user record${recordCount === 1 ? '' : 's'} ready for processing
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    fileInfoElement.innerHTML = fileInfoHTML;
    this.logger.info('File information display updated successfully', {
      recordCount,
      isValidType
    });
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension from filename
   * @param {string} filename - The filename
   * @returns {string} File extension in lowercase
   */
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
  }

  /**
   * Establish real-time connection for import progress tracking
   * CRITICAL: This method was missing and causing UI freeze due to infinite await
   * Last implemented: 2025-07-22 - Fixed UI freeze issue by implementing missing method
   */
  async establishRealTimeConnection(sessionId) {
    try {
      this.logger.debug('🔗 [DEBUG] ImportSubsystem: Establishing real-time connection for session:', sessionId);

      // Check if Socket.IO is available
      if (typeof io !== 'undefined' && this.subsystems?.realtimeManager) {
        this.logger.debug('🔗 [DEBUG] ImportSubsystem: Socket.IO available, setting up real-time connection');

        // Set up Socket.IO connection through realtime subsystem
        this.socket = this.subsystems.realtimeManager.getConnection();
        if (this.socket) {
          // Set up progress event listeners
          this.socket.on(`import-progress-${sessionId}`, data => {
            this.handleProgressUpdate(data);
          });
          this.socket.on(`import-complete-${sessionId}`, data => {
            this.handleImportCompletion(data);
          });
          this.socket.on(`import-error-${sessionId}`, data => {
            this.handleImportError(data);
          });
          this.logger.info('✅ [DEBUG] ImportSubsystem: Real-time connection established successfully');
        } else {
          this.logger.warn('⚠️ [DEBUG] ImportSubsystem: Socket.IO connection not available, using fallback polling');
          this.setupFallbackPolling(sessionId);
        }
      } else {
        this.logger.warn('⚠️ [DEBUG] ImportSubsystem: Socket.IO not available, using fallback polling');
        this.setupFallbackPolling(sessionId);
      }

      // Always resolve immediately to prevent UI freeze
      return Promise.resolve();
    } catch (error) {
      this.logger.error('❌ [DEBUG] ImportSubsystem: Failed to establish real-time connection:', error);
      // Set up fallback polling if real-time connection fails
      this.setupFallbackPolling(sessionId);
      // Always resolve to prevent UI freeze
      return Promise.resolve();
    }
  }

  /**
   * Clean up connections and resources
   */
  cleanupConnections() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.fallbackPolling) {
      clearInterval(this.fallbackPolling);
      this.fallbackPolling = null;
    }
    this.isImporting = false;
  }

  /**
   * Set up fallback polling if Socket.IO fails
   */
  setupFallbackPolling(sessionId) {
    this.fallbackPolling = setInterval(async () => {
      try {
        const response = await this.localClient.get(`/api/import/status/${sessionId}`);
        if (response.data) {
          this.handleProgressUpdate(response.data);
        }
      } catch (error) {
        this.logger.error('Fallback polling failed', error);
      }
    }, 2000);
  }

  /**
   * Set up cross-subsystem event listeners
   */
  setupCrossSubsystemEvents() {
    if (!this.eventBus) {
      this.logger.warn('EventBus not available for cross-subsystem events');
      return;
    }

    // Listen for token expiration events
    this.eventBus.on('tokenExpired', data => {
      this.logger.warn('Token expired during import operation');
      if (this.isImporting) {
        this.cleanupConnections();
        this.uiManager.showError('Session Expired', 'Your authentication token expired during the import. Please re-authenticate and try again.');
      }
    });

    // Listen for token error events
    this.eventBus.on('tokenError', data => {
      this.logger.error('Token error detected', data);
      if (this.isImporting) {
        this.cleanupConnections();
        this.uiManager.showError('Authentication Error', `Authentication failed: ${data.error}`);
      }
    });

    // Listen for token refresh events
    this.eventBus.on('tokenRefreshed', data => {
      this.logger.info('Token refreshed successfully');
      // Token refresh is handled automatically, just log for now
    });

    // Listen for population change events
    this.eventBus.on('populationsChanged', data => {
      this.logger.info('Populations changed, refreshing import dropdown', {
        count: data.count
      });
      this.refreshPopulationDropdown();
    });
    this.logger.debug('Cross-subsystem event listeners set up for ImportSubsystem');
  }

  /**
   * Handle population selection change
   */
  handlePopulationChange(populationId, populationName) {
    this.logger.info('🔄 [DEBUG] ImportSubsystem: Population changed', {
      populationId,
      populationName
    });

    // Update population name display with better visual distinction
    const populationNameDisplay = document.querySelector('.population-name-text');
    if (populationNameDisplay) {
      if (populationId && populationName) {
        populationNameDisplay.innerHTML = `<span class="population-label">Population:</span> <span class="population-value">${populationName}</span>`;
        this.logger.debug('Updated population name display', {
          populationName
        });
      } else {
        populationNameDisplay.innerHTML = `<span class="population-label">Population:</span> <span class="population-placeholder">Select a population</span>`;
      }
    }

    // Update API URL display
    const apiUrlDisplay = document.querySelector('.api-url-text');
    if (apiUrlDisplay) {
      if (populationId) {
        // Construct the API URL for the selected population
        const apiUrl = `/api/populations/${populationId}/users`;
        apiUrlDisplay.textContent = apiUrl;
        this.logger.debug('Updated API URL display', {
          apiUrl
        });
      } else {
        apiUrlDisplay.textContent = 'Select a population to see the API URL';
      }
    }

    // Store the selected population for import operations
    this.selectedPopulationId = populationId;
    this.selectedPopulationName = populationName;

    // Emit event for other subsystems
    if (this.eventBus) {
      this.eventBus.emit('importPopulationChanged', {
        populationId,
        populationName
      });
    }
  }

  /**
   * Refresh the population dropdown for import
   */
  refreshPopulationDropdown() {
    this.logger.info('🔍 [DEBUG] ImportSubsystem: refreshPopulationDropdown called');

    // Use PopulationService directly instead of going through app
    if (this.populationService) {
      this.logger.info('🔍 [DEBUG] ImportSubsystem: PopulationService available, calling populateDropdown');
      this.populationService.populateDropdown('import-population-select', {
        includeEmpty: true,
        emptyText: 'Select a population'
      }).then(() => {
        this.logger.info('✅ [DEBUG] ImportSubsystem: Import population dropdown refreshed successfully');
      }).catch(error => {
        this.logger.error('❌ [DEBUG] ImportSubsystem: Failed to refresh import population dropdown', error);
        this.uiManager.showError('Population Refresh Failed', 'Failed to refresh population dropdown.');
      });
    } else {
      this.logger.error('❌ [DEBUG] ImportSubsystem: PopulationService not available for dropdown refresh', {
        populationServiceType: typeof this.populationService,
        populationServiceExists: !!this.populationService
      });
    }
  }
}
exports.ImportSubsystem = ImportSubsystem;

},{}],55:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NavigationSubsystem = void 0;
var _browserLoggingService = require("../utils/browser-logging-service.js");
/**
 * Navigation Subsystem
 * 
 * Manages all navigation, routing, and view switching functionality.
 * Extracted from app.js to provide centralized navigation control.
 * 
 * Features:
 * - View switching and routing
 * - Navigation state management
 * - URL handling and deep linking
 * - View-specific initialization
 * - Navigation history tracking
 */

class NavigationSubsystem {
  constructor(logger, uiManager, settingsManager, app) {
    this.logger = logger || (0, _browserLoggingService.createLogger)({
      serviceName: 'navigation-subsystem',
      environment: 'development'
    });
    this.uiManager = uiManager;
    this.settingsManager = settingsManager;
    this.app = app; // Reference to main app for version access

    // Navigation state
    this.currentView = 'home'; // Default view
    this.previousView = null;
    this.navigationHistory = [];
    this.viewInitializers = new Map();
    this.viewCleanupHandlers = new Map();

    // Navigation elements
    this.navItems = null;
    this.viewContainers = null;
    this.logger.info('Navigation subsystem initialized');
  }

  /**
   * Initialize the navigation subsystem
   */
  async init() {
    try {
      this.logger.info('Initializing navigation subsystem...');

      // Find navigation elements
      this.navItems = document.querySelectorAll('[data-view]');
      this.viewContainers = document.querySelectorAll('.view-container, [id$="-view"]');
      this.logger.info('Navigation elements found', {
        navItems: this.navItems.length,
        viewContainers: this.viewContainers.length
      });

      // Set up navigation event listeners
      this.setupNavigationListeners();

      // Register default view initializers
      this.registerDefaultViewInitializers();

      // Initialize current view
      await this.showView(this.currentView);
      this.logger.info('Navigation subsystem initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize navigation subsystem', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Set up navigation event listeners
   */
  setupNavigationListeners() {
    this.navItems.forEach(item => {
      item.addEventListener('click', async e => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        this.logger.debug('Navigation item clicked', {
          view
        });
        if (view && view !== this.currentView) {
          await this.navigateToView(view);
        }
      });
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', e => {
      if (e.state && e.state.view) {
        this.showView(e.state.view, false); // Don't push to history
      }
    });
    this.logger.debug('Navigation listeners set up');
  }

  /**
   * Navigate to a specific view
   * @param {string} view - The view to navigate to
   * @param {Object} options - Navigation options
   */
  async navigateToView(view) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    try {
      this.logger.info('Navigating to view', {
        from: this.currentView,
        to: view
      });

      // Validate view exists
      if (!this.isValidView(view)) {
        this.logger.warn('Invalid view requested', {
          view
        });
        return false;
      }

      // Check if navigation is allowed
      if (options.force !== true && !(await this.canNavigateFrom(this.currentView))) {
        this.logger.info('Navigation blocked by current view', {
          currentView: this.currentView
        });
        return false;
      }

      // Show the view
      const success = await this.showView(view, options.pushToHistory !== false);
      if (success) {
        this.logger.info('Navigation completed successfully', {
          view
        });
      }
      return success;
    } catch (error) {
      this.logger.error('Navigation failed', {
        view,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Show a specific view
   * @param {string} view - The view to show
   * @param {boolean} pushToHistory - Whether to push to browser history
   */
  async showView(view) {
    let pushToHistory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    try {
      this.logger.debug('Showing view', {
        view,
        pushToHistory
      });

      // Store previous view
      this.previousView = this.currentView;

      // Run cleanup for previous view
      if (this.previousView && this.viewCleanupHandlers.has(this.previousView)) {
        try {
          await this.viewCleanupHandlers.get(this.previousView)();
          this.logger.debug('View cleanup completed', {
            view: this.previousView
          });
        } catch (error) {
          this.logger.warn('View cleanup failed', {
            view: this.previousView,
            error: error.message
          });
        }
      }

      // Hide all views
      this.hideAllViews();

      // Show target view
      const viewElement = document.getElementById(`${view}-view`);
      if (viewElement) {
        viewElement.style.display = 'block';
        viewElement.classList.add('active');
      } else {
        this.logger.warn('View element not found', {
          view
        });
        return false;
      }

      // Update navigation state
      this.updateNavigationState(view);

      // Run view initializer
      if (this.viewInitializers.has(view)) {
        try {
          await this.viewInitializers.get(view)();
          this.logger.debug('View initializer completed', {
            view
          });
        } catch (error) {
          this.logger.warn('View initializer failed', {
            view,
            error: error.message
          });
        }
      }

      // Update browser history
      if (pushToHistory && window.history) {
        const url = new URL(window.location);
        url.searchParams.set('view', view);
        window.history.pushState({
          view
        }, '', url);
      }

      // Update current view
      this.currentView = view;

      // Add to navigation history
      this.navigationHistory.push({
        view,
        timestamp: Date.now(),
        from: this.previousView
      });

      // Limit history size
      if (this.navigationHistory.length > 50) {
        this.navigationHistory = this.navigationHistory.slice(-50);
      }
      this.logger.info('View shown successfully', {
        view
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to show view', {
        view,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Hide all views
   */
  hideAllViews() {
    this.viewContainers.forEach(container => {
      container.style.display = 'none';
      container.classList.remove('active');
    });
    this.logger.debug('All views hidden');
  }

  /**
   * Update navigation state (active nav items, etc.)
   * @param {string} view - The active view
   */
  updateNavigationState(view) {
    // Update navigation items
    this.navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('data-view') === view) {
        item.classList.add('active');
      }
    });

    // Update page title if needed
    this.updatePageTitle(view);
    this.logger.debug('Navigation state updated', {
      view
    });
  }

  /**
   * Update page title based on current view
   * @param {string} view - The current view
   */
  updatePageTitle(view) {
    const titles = {
      'import': 'Import Users',
      'export': 'Export Users',
      'modify': 'Modify Users',
      'delete-csv': 'Delete Users',
      'settings': 'Settings',
      'logs': 'Logs',
      'history': 'History'
    };
    const baseTitle = `PingOne User Import v${this.app.version}`;
    const viewTitle = titles[view];
    if (viewTitle) {
      document.title = `${viewTitle} - ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }

  /**
   * Register a view initializer
   * @param {string} view - The view name
   * @param {Function} initializer - The initializer function
   */
  registerViewInitializer(view, initializer) {
    this.viewInitializers.set(view, initializer);
    this.logger.debug('View initializer registered', {
      view
    });
  }

  /**
   * Register a view cleanup handler
   * @param {string} view - The view name
   * @param {Function} cleanup - The cleanup function
   */
  registerViewCleanup(view, cleanup) {
    this.viewCleanupHandlers.set(view, cleanup);
    this.logger.debug('View cleanup handler registered', {
      view
    });
  }

  /**
   * Register default view initializers
   */
  registerDefaultViewInitializers() {
    // Import view initializer
    this.registerViewInitializer('import', async () => {
      if (typeof window.app?.loadPopulations === 'function') {
        await window.app.loadPopulations('import-population-select');
      }
    });

    // Export view initializer
    this.registerViewInitializer('export', async () => {
      if (window.exportManager && typeof window.exportManager.loadPopulations === 'function') {
        await window.exportManager.loadPopulations();
      }
    });

    // Delete view initializer
    this.registerViewInitializer('delete-csv', async () => {
      if (window.deleteManager && typeof window.deleteManager.loadPopulations === 'function') {
        await window.deleteManager.loadPopulations();
      }
    });

    // Modify view initializer
    this.registerViewInitializer('modify', async () => {
      if (typeof window.app?.loadPopulations === 'function') {
        await window.app.loadPopulations('modify-population-select');
      }
    });

    // Logs/History view initializer
    this.registerViewInitializer('logs', async () => {
      if (window.logManager && typeof window.logManager.loadLogs === 'function') {
        window.logManager.loadLogs();
      }
    });
    this.registerViewInitializer('history', async () => {
      if (window.logManager && typeof window.logManager.loadLogs === 'function') {
        window.logManager.loadLogs();
      }
    });
    this.logger.debug('Default view initializers registered');
  }

  /**
   * Check if a view is valid
   * @param {string} view - The view to validate
   * @returns {boolean} - Whether the view is valid
   */
  isValidView(view) {
    const validViews = ['home', 'import', 'export', 'modify', 'delete-csv', 'settings', 'logs', 'history', 'analytics'];
    return validViews.includes(view);
  }

  /**
   * Check if navigation is allowed from current view
   * @param {string} fromView - The view to navigate from
   * @returns {Promise<boolean>} - Whether navigation is allowed
   */
  async canNavigateFrom(fromView) {
    // Check for unsaved changes, running operations, etc.

    // Check if import is running
    if (fromView === 'import' && window.app?.isImportRunning) {
      const confirmed = confirm('Import is currently running. Are you sure you want to leave this page?');
      return confirmed;
    }

    // Check if export is running
    if (fromView === 'export' && window.exportManager?.isExportRunning) {
      const confirmed = confirm('Export is currently running. Are you sure you want to leave this page?');
      return confirmed;
    }

    // Check if delete is running
    if (fromView === 'delete-csv' && window.deleteManager?.isDeleteRunning) {
      const confirmed = confirm('Delete operation is currently running. Are you sure you want to leave this page?');
      return confirmed;
    }

    // Check for unsaved settings
    if (fromView === 'settings' && this.settingsManager?.hasUnsavedChanges?.()) {
      const confirmed = confirm('You have unsaved settings. Are you sure you want to leave without saving?');
      return confirmed;
    }
    return true;
  }

  /**
   * Get current view
   * @returns {string} - The current view
   */
  getCurrentView() {
    return this.currentView;
  }

  /**
   * Get previous view
   * @returns {string|null} - The previous view
   */
  getPreviousView() {
    return this.previousView;
  }

  /**
   * Get navigation history
   * @returns {Array} - The navigation history
   */
  getNavigationHistory() {
    return [...this.navigationHistory];
  }

  /**
   * Go back to previous view
   */
  async goBack() {
    if (this.previousView) {
      await this.navigateToView(this.previousView);
    } else if (this.navigationHistory.length > 1) {
      const previousEntry = this.navigationHistory[this.navigationHistory.length - 2];
      await this.navigateToView(previousEntry.view);
    }
  }

  /**
   * Refresh current view
   */
  async refreshCurrentView() {
    await this.showView(this.currentView, false);
  }

  /**
   * Get view statistics
   * @returns {Object} - View usage statistics
   */
  getViewStats() {
    const stats = {};
    this.navigationHistory.forEach(entry => {
      if (!stats[entry.view]) {
        stats[entry.view] = {
          count: 0,
          lastVisited: null
        };
      }
      stats[entry.view].count++;
      stats[entry.view].lastVisited = entry.timestamp;
    });
    return stats;
  }

  /**
   * Clean up the navigation subsystem
   */
  cleanup() {
    // Remove event listeners
    this.navItems.forEach(item => {
      item.removeEventListener('click', this.handleNavClick);
    });
    window.removeEventListener('popstate', this.handlePopState);

    // Clear state
    this.viewInitializers.clear();
    this.viewCleanupHandlers.clear();
    this.navigationHistory = [];
    this.logger.info('Navigation subsystem cleaned up');
  }
}
exports.NavigationSubsystem = NavigationSubsystem;

},{"../utils/browser-logging-service.js":60}],56:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.OperationManagerSubsystem = void 0;
var _browserLoggingService = require("../utils/browser-logging-service.js");
/**
 * Operation Manager Subsystem
 * 
 * Manages all CRUD operations (Import, Export, Delete, Modify) with centralized
 * orchestration, validation, progress tracking, and error handling.
 * 
 * Features:
 * - Unified operation lifecycle management
 * - Operation validation and pre-checks
 * - Progress tracking and status updates
 * - Error handling and recovery
 * - Operation queuing and concurrency control
 * - Operation history and logging
 */

class OperationManagerSubsystem {
  constructor(logger, uiManager, settingsManager, apiClient) {
    this.logger = logger || (0, _browserLoggingService.createLogger)({
      serviceName: 'operation-manager-subsystem',
      environment: 'development'
    });
    this.uiManager = uiManager;
    this.settingsManager = settingsManager;
    this.apiClient = apiClient;

    // Operation state
    this.currentOperation = null;
    this.operationQueue = [];
    this.operationHistory = [];
    this.isOperationRunning = false;

    // Operation types
    this.operationTypes = {
      IMPORT: 'import',
      EXPORT: 'export',
      DELETE: 'delete',
      MODIFY: 'modify'
    };

    // Operation validators
    this.validators = new Map();
    this.preChecks = new Map();
    this.postChecks = new Map();
    this.logger.info('Operation Manager subsystem initialized');
  }

  /**
   * Initialize the operation manager subsystem
   */
  async init() {
    try {
      this.logger.info('Initializing operation manager subsystem...');

      // Register default validators and checks
      this.registerDefaultValidators();
      this.registerDefaultPreChecks();
      this.registerDefaultPostChecks();
      this.logger.info('Operation Manager subsystem initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize operation manager subsystem', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start an operation
   * @param {string} type - Operation type (import, export, delete, modify)
   * @param {Object} options - Operation options
   * @returns {Promise<Object>} - Operation result
   */
  async startOperation(type) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    try {
      this.logger.info('Starting operation', {
        type,
        options
      });

      // Check if operation is already running
      if (this.isOperationRunning) {
        throw new Error('Another operation is already running');
      }

      // Validate operation type
      if (!Object.values(this.operationTypes).includes(type)) {
        throw new Error(`Invalid operation type: ${type}`);
      }

      // Create operation context
      const operation = {
        id: this.generateOperationId(),
        type,
        options,
        status: 'initializing',
        startTime: Date.now(),
        endTime: null,
        progress: {
          current: 0,
          total: 0,
          percentage: 0,
          message: 'Initializing...'
        },
        result: null,
        error: null
      };
      this.currentOperation = operation;
      this.isOperationRunning = true;

      // Run pre-checks
      await this.runPreChecks(operation);

      // Validate operation
      await this.validateOperation(operation);

      // Execute operation
      const result = await this.executeOperation(operation);

      // Run post-checks
      await this.runPostChecks(operation);

      // Complete operation
      operation.status = 'completed';
      operation.endTime = Date.now();
      operation.result = result;
      this.logger.info('Operation completed successfully', {
        type,
        duration: operation.endTime - operation.startTime
      });
      return result;
    } catch (error) {
      this.logger.error('Operation failed', {
        type,
        error: error.message
      });
      if (this.currentOperation) {
        this.currentOperation.status = 'failed';
        this.currentOperation.endTime = Date.now();
        this.currentOperation.error = error.message;
      }
      throw error;
    } finally {
      // Clean up
      this.finalizeOperation();
    }
  }

  /**
   * Execute the actual operation
   * @param {Object} operation - Operation context
   * @returns {Promise<Object>} - Operation result
   */
  async executeOperation(operation) {
    const {
      type,
      options
    } = operation;
    this.logger.debug('Executing operation', {
      type
    });
    switch (type) {
      case this.operationTypes.IMPORT:
        return await this.executeImport(operation);
      case this.operationTypes.EXPORT:
        return await this.executeExport(operation);
      case this.operationTypes.DELETE:
        return await this.executeDelete(operation);
      case this.operationTypes.MODIFY:
        return await this.executeModify(operation);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  /**
   * Execute import operation
   * @param {Object} operation - Operation context
   * @returns {Promise<Object>} - Import result
   */
  async executeImport(operation) {
    const {
      options
    } = operation;
    this.logger.info('Executing import operation', {
      options
    });

    // Update progress
    this.updateOperationProgress(operation, 0, 100, 'Starting import...');

    // Prepare import data
    const importData = {
      file: options.file,
      populationId: options.populationId,
      populationName: options.populationName,
      skipDuplicates: options.skipDuplicates || false,
      updateExisting: options.updateExisting || false
    };

    // Start import via API
    const response = await this.apiClient.post('/api/import', importData);
    if (!response.success) {
      throw new Error(response.error || 'Import failed');
    }

    // Track progress via SSE or polling
    await this.trackOperationProgress(operation, response.sessionId);
    return {
      success: true,
      sessionId: response.sessionId,
      message: 'Import completed successfully'
    };
  }

  /**
   * Execute export operation
   * @param {Object} operation - Operation context
   * @returns {Promise<Object>} - Export result
   */
  async executeExport(operation) {
    const {
      options
    } = operation;
    this.logger.info('Executing export operation', {
      options
    });

    // Update progress
    this.updateOperationProgress(operation, 0, 100, 'Starting export...');

    // Prepare export data
    const exportData = {
      populationId: options.populationId,
      populationName: options.populationName,
      includeDisabled: options.includeDisabled || false,
      format: options.format || 'csv'
    };

    // Start export via API
    const response = await this.apiClient.post('/api/export', exportData);
    if (!response.success) {
      throw new Error(response.error || 'Export failed');
    }

    // Track progress
    await this.trackOperationProgress(operation, response.sessionId);
    return {
      success: true,
      sessionId: response.sessionId,
      downloadUrl: response.downloadUrl,
      message: 'Export completed successfully'
    };
  }

  /**
   * Execute delete operation
   * @param {Object} operation - Operation context
   * @returns {Promise<Object>} - Delete result
   */
  async executeDelete(operation) {
    const {
      options
    } = operation;
    this.logger.info('Executing delete operation', {
      options
    });

    // Update progress
    this.updateOperationProgress(operation, 0, 100, 'Starting delete...');

    // Prepare delete data
    const deleteData = {
      file: options.file,
      populationId: options.populationId,
      populationName: options.populationName,
      confirmDelete: true
    };

    // Start delete via API
    const response = await this.apiClient.post('/api/delete', deleteData);
    if (!response.success) {
      throw new Error(response.error || 'Delete failed');
    }

    // Track progress
    await this.trackOperationProgress(operation, response.sessionId);
    return {
      success: true,
      sessionId: response.sessionId,
      message: 'Delete completed successfully'
    };
  }

  /**
   * Execute modify operation
   * @param {Object} operation - Operation context
   * @returns {Promise<Object>} - Modify result
   */
  async executeModify(operation) {
    const {
      options
    } = operation;
    this.logger.info('Executing modify operation', {
      options
    });

    // Update progress
    this.updateOperationProgress(operation, 0, 100, 'Starting modify...');

    // Prepare modify data
    const modifyData = {
      file: options.file,
      populationId: options.populationId,
      populationName: options.populationName,
      updateFields: options.updateFields || []
    };

    // Start modify via API
    const response = await this.apiClient.post('/api/modify', modifyData);
    if (!response.success) {
      throw new Error(response.error || 'Modify failed');
    }

    // Track progress
    await this.trackOperationProgress(operation, response.sessionId);
    return {
      success: true,
      sessionId: response.sessionId,
      message: 'Modify completed successfully'
    };
  }

  /**
   * Track operation progress via SSE or polling
   * @param {Object} operation - Operation context
   * @param {string} sessionId - Session ID for tracking
   */
  async trackOperationProgress(operation, sessionId) {
    return new Promise((resolve, reject) => {
      // Try SSE first
      if (typeof EventSource !== 'undefined') {
        this.trackProgressViaSSE(operation, sessionId, resolve, reject);
      } else {
        // Fallback to polling
        this.trackProgressViaPolling(operation, sessionId, resolve, reject);
      }
    });
  }

  /**
   * Track progress via Server-Sent Events
   * @param {Object} operation - Operation context
   * @param {string} sessionId - Session ID
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  trackProgressViaSSE(operation, sessionId, resolve, reject) {
    const eventSource = new EventSource(`/api/progress/${sessionId}`);
    eventSource.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        this.handleProgressUpdate(operation, data);
        if (data.status === 'completed') {
          eventSource.close();
          resolve(data);
        } else if (data.status === 'failed') {
          eventSource.close();
          reject(new Error(data.error || 'Operation failed'));
        }
      } catch (error) {
        this.logger.error('Error parsing SSE data', {
          error: error.message
        });
      }
    };
    eventSource.onerror = error => {
      this.logger.error('SSE connection error', {
        error
      });
      eventSource.close();
      // Fallback to polling
      this.trackProgressViaPolling(operation, sessionId, resolve, reject);
    };
  }

  /**
   * Track progress via polling
   * @param {Object} operation - Operation context
   * @param {string} sessionId - Session ID
   * @param {Function} resolve - Promise resolve function
   * @param {Function} reject - Promise reject function
   */
  async trackProgressViaPolling(operation, sessionId, resolve, reject) {
    const pollInterval = 1000; // 1 second

    const poll = async () => {
      try {
        const response = await this.apiClient.get(`/api/progress/${sessionId}`);
        if (response.success) {
          this.handleProgressUpdate(operation, response.data);
          if (response.data.status === 'completed') {
            resolve(response.data);
          } else if (response.data.status === 'failed') {
            reject(new Error(response.data.error || 'Operation failed'));
          } else {
            setTimeout(poll, pollInterval);
          }
        } else {
          reject(new Error(response.error || 'Failed to get progress'));
        }
      } catch (error) {
        reject(error);
      }
    };
    poll();
  }

  /**
   * Handle progress update
   * @param {Object} operation - Operation context
   * @param {Object} progressData - Progress data from server
   */
  handleProgressUpdate(operation, progressData) {
    // Update operation progress
    operation.progress = {
      current: progressData.current || 0,
      total: progressData.total || 0,
      percentage: progressData.percentage || 0,
      message: progressData.message || 'Processing...'
    };

    // Update UI
    if (this.uiManager) {
      this.uiManager.updateProgress(operation.progress.current, operation.progress.total, operation.progress.message);
    }
    this.logger.debug('Progress updated', {
      type: operation.type,
      progress: operation.progress
    });
  }

  /**
   * Update operation progress
   * @param {Object} operation - Operation context
   * @param {number} current - Current progress
   * @param {number} total - Total progress
   * @param {string} message - Progress message
   */
  updateOperationProgress(operation, current, total, message) {
    const percentage = total > 0 ? Math.round(current / total * 100) : 0;
    operation.progress = {
      current,
      total,
      percentage,
      message
    };

    // Update UI
    if (this.uiManager) {
      this.uiManager.updateProgress(current, total, message);
    }
    this.logger.debug('Operation progress updated', {
      type: operation.type,
      progress: operation.progress
    });
  }

  /**
   * Run pre-checks for operation
   * @param {Object} operation - Operation context
   */
  async runPreChecks(operation) {
    const preCheck = this.preChecks.get(operation.type);
    if (preCheck) {
      this.logger.debug('Running pre-checks', {
        type: operation.type
      });
      await preCheck(operation);
    }
  }

  /**
   * Validate operation
   * @param {Object} operation - Operation context
   */
  async validateOperation(operation) {
    const validator = this.validators.get(operation.type);
    if (validator) {
      this.logger.debug('Validating operation', {
        type: operation.type
      });
      await validator(operation);
    }
  }

  /**
   * Run post-checks for operation
   * @param {Object} operation - Operation context
   */
  async runPostChecks(operation) {
    const postCheck = this.postChecks.get(operation.type);
    if (postCheck) {
      this.logger.debug('Running post-checks', {
        type: operation.type
      });
      await postCheck(operation);
    }
  }

  /**
   * Finalize operation
   */
  finalizeOperation() {
    if (this.currentOperation) {
      // Add to history
      this.operationHistory.push({
        ...this.currentOperation
      });

      // Limit history size
      if (this.operationHistory.length > 100) {
        this.operationHistory = this.operationHistory.slice(-100);
      }

      // Clear current operation
      this.currentOperation = null;
    }
    this.isOperationRunning = false;
    this.logger.debug('Operation finalized');
  }

  /**
   * Register default validators
   */
  registerDefaultValidators() {
    // Import validator
    this.validators.set(this.operationTypes.IMPORT, async operation => {
      const {
        options
      } = operation;
      if (!options.file) {
        throw new Error('No file selected for import');
      }
      if (!options.populationId) {
        throw new Error('No population selected for import');
      }
    });

    // Export validator
    this.validators.set(this.operationTypes.EXPORT, async operation => {
      const {
        options
      } = operation;
      if (!options.populationId) {
        throw new Error('No population selected for export');
      }
    });

    // Delete validator
    this.validators.set(this.operationTypes.DELETE, async operation => {
      const {
        options
      } = operation;
      if (!options.file) {
        throw new Error('No file selected for delete');
      }
      if (!options.populationId) {
        throw new Error('No population selected for delete');
      }
    });

    // Modify validator
    this.validators.set(this.operationTypes.MODIFY, async operation => {
      const {
        options
      } = operation;
      if (!options.file) {
        throw new Error('No file selected for modify');
      }
      if (!options.populationId) {
        throw new Error('No population selected for modify');
      }
    });
  }

  /**
   * Register default pre-checks
   */
  registerDefaultPreChecks() {
    // Common pre-check for all operations
    const commonPreCheck = async operation => {
      // Check token validity
      if (window.app && typeof window.app.checkTokenAndRedirect === 'function') {
        const hasValidToken = await window.app.checkTokenAndRedirect(operation.type);
        if (!hasValidToken) {
          throw new Error('Invalid or expired token');
        }
      }
    };

    // Register for all operation types
    Object.values(this.operationTypes).forEach(type => {
      this.preChecks.set(type, commonPreCheck);
    });
  }

  /**
   * Register default post-checks
   */
  registerDefaultPostChecks() {
    // Common post-check for all operations
    const commonPostCheck = async operation => {
      // Log operation completion
      this.logger.info('Operation completed', {
        type: operation.type,
        duration: operation.endTime - operation.startTime,
        status: operation.status
      });
    };

    // Register for all operation types
    Object.values(this.operationTypes).forEach(type => {
      this.postChecks.set(type, commonPostCheck);
    });
  }

  /**
   * Generate unique operation ID
   * @returns {string} - Unique operation ID
   */
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cancel current operation
   */
  async cancelOperation() {
    if (this.currentOperation && this.isOperationRunning) {
      this.logger.info('Cancelling operation', {
        type: this.currentOperation.type
      });
      try {
        // Try to cancel via API
        if (this.currentOperation.sessionId) {
          await this.apiClient.post(`/api/cancel/${this.currentOperation.sessionId}`);
        }
        this.currentOperation.status = 'cancelled';
        this.currentOperation.endTime = Date.now();
        this.logger.info('Operation cancelled successfully');
      } catch (error) {
        this.logger.error('Failed to cancel operation', {
          error: error.message
        });
      } finally {
        this.finalizeOperation();
      }
    }
  }

  /**
   * Get current operation status
   * @returns {Object|null} - Current operation or null
   */
  getCurrentOperation() {
    return this.currentOperation ? {
      ...this.currentOperation
    } : null;
  }

  /**
   * Get operation history
   * @returns {Array} - Operation history
   */
  getOperationHistory() {
    return [...this.operationHistory];
  }

  /**
   * Check if operation is running
   * @returns {boolean} - Whether operation is running
   */
  isRunning() {
    return this.isOperationRunning;
  }

  /**
   * Get operation statistics
   * @returns {Object} - Operation statistics
   */
  getOperationStats() {
    const stats = {
      total: this.operationHistory.length,
      byType: {},
      byStatus: {},
      averageDuration: 0
    };
    let totalDuration = 0;
    this.operationHistory.forEach(op => {
      // By type
      if (!stats.byType[op.type]) {
        stats.byType[op.type] = 0;
      }
      stats.byType[op.type]++;

      // By status
      if (!stats.byStatus[op.status]) {
        stats.byStatus[op.status] = 0;
      }
      stats.byStatus[op.status]++;

      // Duration
      if (op.endTime && op.startTime) {
        totalDuration += op.endTime - op.startTime;
      }
    });
    if (this.operationHistory.length > 0) {
      stats.averageDuration = Math.round(totalDuration / this.operationHistory.length);
    }
    return stats;
  }
}
exports.OperationManagerSubsystem = OperationManagerSubsystem;

},{"../utils/browser-logging-service.js":60}],57:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * @file Manages fetching and caching of PingOne populations.
 * This subsystem is responsible for populating UI elements like dropdowns
 * with the available user populations from the PingOne environment.
 */

class PopulationSubsystem {
  /**
   * @param {Logger} logger A logger instance.
   * @param {LocalApiClient} localClient An API client for making requests.
   * @param {EventBus} eventBus For listening to events like credential updates.
   */
  constructor(logger, localClient, eventBus) {
    if (!logger || !localClient || !eventBus) {
      throw new Error('PopulationSubsystem: logger, localClient, and eventBus are required.');
    }
    this.logger = logger.child({
      subsystem: 'PopulationSubsystem'
    });
    this.localClient = localClient;
    this.eventBus = eventBus;
    this.populations = [];
    this.isInitialized = false;
    this.logger.info('PopulationSubsystem initialized.');
  }

  /**
   * Initializes the subsystem, fetches initial population data if possible.
   */
  async init() {
    this.logger.info('Initializing...');
    // Listen for events that might trigger a population refresh
    this.eventBus.on('credentials-updated', () => this.fetchPopulations(true));
    await this.fetchPopulations();
    this.isInitialized = true;
    this.logger.info('Successfully initialized.');
  }

  /**
   * Fetches populations from the server.
   * @param {boolean} forceRefresh Whether to force a refresh even if data exists.
   * @returns {Promise<Array>}
   */
  async fetchPopulations() {
    let forceRefresh = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    if (this.populations.length > 0 && !forceRefresh) {
      this.logger.debug('Returning cached populations.');
      return this.populations;
    }
    this.logger.info('Fetching populations from the server...');
    try {
      const data = await this.localClient.get('/pingone/populations');
      this.populations = data.populations || [];
      this.logger.info(`Successfully fetched ${this.populations.length} populations.`);
      this.eventBus.emit('populations-updated', this.populations);
      return this.populations;
    } catch (error) {
      this.logger.error('Failed to fetch populations:', error);
      this.populations = []; // Clear cache on error
      this.eventBus.emit('populations-updated:error', error);
      return [];
    }
  }

  /**
   * Gets the currently cached populations.
   * @returns {Array}
   */
  getPopulations() {
    return this.populations;
  }

  /**
   * Gets a population by its ID.
   * @param {string} populationId The ID of the population.
   * @returns {object|undefined}
   */
  getPopulationById(populationId) {
    return this.populations.find(p => p.id === populationId);
  }
}
var _default = exports.default = PopulationSubsystem;

},{}],58:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * Settings Management Subsystem
 * 
 * Handles all settings operations with proper separation of concerns.
 * Manages settings form validation, saving, and UI feedback.
 */

class SettingsSubsystem {
  constructor(logger, uiManager, localClient, settingsManager, eventBus, credentialsManager) {
    this.logger = logger;
    this.uiManager = uiManager;
    this.localClient = localClient;
    this.settingsManager = settingsManager;
    this.eventBus = eventBus;
    this.credentialsManager = credentialsManager;

    // Settings state management
    this.isSaving = false;
    this.currentSettings = null;
    this.logger.info('Settings Subsystem initialized');

    // Set up event listeners for cross-subsystem communication
    this.setupCrossSubsystemEvents();
  }

  /**
   * Initialize the settings subsystem
   */
  async init() {
    try {
      this.setupEventListeners();
      await this.loadCurrentSettings();
      this.logger.info('Settings Subsystem initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Settings Subsystem', error);
      this.uiManager.showSettingsActionStatus('Failed to initialize Settings Subsystem: ' + error.message, 'error');
    }
  }

  /**
   * Set up event listeners for settings-related elements
   */
  setupEventListeners() {
    this.logger.info('Setting up Settings Subsystem event listeners');

    // Save settings button
    const saveBtn = document.getElementById('save-settings');
    if (saveBtn) {
      this.logger.info('Found save settings button, attaching event listener');
      saveBtn.addEventListener('click', async e => {
        e.preventDefault();
        this.logger.info('Save settings button clicked');
        await this.saveSettings();
      });
    } else {
      this.logger.warn('Save settings button not found in DOM');
    }

    // Test connection button
    const testBtn = document.getElementById('test-connection-btn');
    if (testBtn) {
      testBtn.addEventListener('click', async e => {
        e.preventDefault();
        await this.testConnection();
      });
    }

    // Get token button
    const tokenBtn = document.getElementById('get-token-btn');
    if (tokenBtn) {
      tokenBtn.addEventListener('click', async e => {
        e.preventDefault();
        await this.getToken();
      });
    }

    // API secret visibility toggle
    const toggleBtn = document.getElementById('toggle-api-secret-visibility');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', e => {
        e.preventDefault();
        this.toggleSecretVisibility();
      });
    }
    this.logger.info('Settings Subsystem event listeners setup complete');
  }

  /**
   * Load current settings from settings manager
   */
  async loadCurrentSettings() {
    try {
      this.currentSettings = this.settingsManager.getSettings();
      this.populateSettingsForm(this.currentSettings);
      this.logger.info('Current settings loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load current settings', error);
      throw error;
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    if (this.isSaving) {
      this.logger.warn('Settings save already in progress');
      return;
    }
    try {
      this.isSaving = true;
      this.logger.info('Starting settings save process');

      // Debug: Check all dependencies
      this.logger.debug('Checking saveSettings dependencies:', {
        hasUIManager: !!this.uiManager,
        hasLocalClient: !!this.localClient,
        hasSettingsManager: !!this.settingsManager,
        hasCredentialsManager: !!this.credentialsManager,
        hasEventBus: !!this.eventBus
      });

      // Show immediate feedback
      if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
        this.uiManager.showSettingsActionStatus('Saving settings...', 'info');
        this.logger.debug('UI feedback shown successfully');
      } else {
        this.logger.warn('UIManager or showSettingsActionStatus method not available');
      }

      // Get form data
      let settings;
      try {
        settings = this.getFormData();
        this.logger.info('Form data extracted successfully:', settings);
      } catch (formError) {
        this.logger.error('Failed to get form data:', formError);
        throw new Error(`Form data extraction failed: ${formError.message}`);
      }

      // Validate settings
      try {
        if (!this.validateSettings(settings)) {
          this.logger.error('Settings validation failed');
          return;
        }
        this.logger.debug('Settings validation passed');
      } catch (validationError) {
        this.logger.error('Settings validation error:', validationError);
        throw new Error(`Settings validation error: ${validationError.message}`);
      }

      // Save to credentials manager if available
      if (this.credentialsManager) {
        try {
          const credentials = {
            environmentId: settings.environmentId || '',
            apiClientId: settings.apiClientId || '',
            apiSecret: settings.apiSecret || '',
            populationId: settings.populationId || '',
            region: settings.region || 'NorthAmerica'
          };
          const validation = this.credentialsManager.validateCredentials(credentials);
          if (!validation.isValid) {
            throw new Error(`Invalid credentials: ${validation.errors.join(', ')}`);
          }
          this.credentialsManager.saveCredentials(credentials);
          this.logger.info('Credentials saved to localStorage successfully');
        } catch (credentialsError) {
          this.logger.error('Credentials manager error:', credentialsError);
          throw new Error(`Credentials save failed: ${credentialsError.message}`);
        }
      } else {
        this.logger.debug('No credentials manager available, skipping credentials save');
      }

      // Save to server
      if (this.localClient && typeof this.localClient.post === 'function') {
        try {
          this.logger.debug('Attempting server save with localClient.post');
          const response = await this.localClient.post('/api/settings', settings);
          this.logger.info('Server save successful:', response);
        } catch (serverError) {
          this.logger.error('Failed to save to server:', serverError);
          const errorMessage = serverError.message || 'Unknown server error';
          if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
            this.uiManager.showSettingsActionStatus('Failed to save settings: ' + errorMessage, 'error', {
              autoHide: false
            });
          }
          throw new Error(`Server save failed: ${errorMessage}`);
        }
      } else {
        this.logger.error('LocalClient not available or post method missing');
        throw new Error('LocalClient not available for server communication');
      }

      // Update settings manager
      if (this.settingsManager && typeof this.settingsManager.updateSettings === 'function') {
        try {
          this.settingsManager.updateSettings(settings);
          this.currentSettings = settings;
          this.logger.debug('Settings manager updated successfully');
        } catch (settingsManagerError) {
          this.logger.error('Settings manager update error:', settingsManagerError);
          throw new Error(`Settings manager update failed: ${settingsManagerError.message}`);
        }
      } else {
        this.logger.warn('Settings manager not available or updateSettings method missing');
      }

      // Show success feedback
      if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
        this.uiManager.showSettingsActionStatus('Settings saved successfully', 'success', {
          autoHideDelay: 3000
        });
      }

      // Update connection status
      try {
        if (typeof this.updateConnectionStatus === 'function') {
          this.updateConnectionStatus('✅ Settings saved! Please - Get token', 'success');
        }
      } catch (connectionStatusError) {
        this.logger.warn('Connection status update failed:', connectionStatusError);
      }

      // Emit event for other subsystems
      if (this.eventBus && typeof this.eventBus.emit === 'function') {
        try {
          this.eventBus.emit('settingsSaved', {
            settings
          });
          this.logger.debug('Settings saved event emitted successfully');
        } catch (eventError) {
          this.logger.warn('Event emission failed:', eventError);
        }
      }
      this.logger.info('Settings save process completed successfully');
    } catch (error) {
      this.logger.error('Failed to save settings - detailed error:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      if (this.uiManager && typeof this.uiManager.showSettingsActionStatus === 'function') {
        this.uiManager.showSettingsActionStatus('Failed to save settings: ' + error.message, 'error', {
          autoHide: false
        });
      }

      // Re-throw the error so it can be caught by calling code
      throw error;
    } finally {
      this.isSaving = false;
      this.logger.debug('Settings save process finished, isSaving flag reset');
    }
  }

  /**
   * Get form data from settings form
   */
  getFormData() {
    const form = document.getElementById('settings-form');
    if (!form) {
      throw new Error('Settings form not found');
    }
    const formData = new FormData(form);
    const settings = {
      environmentId: formData.get('environment-id') || '',
      apiClientId: formData.get('api-client-id') || '',
      apiSecret: formData.get('api-secret') || '',
      region: formData.get('region') || 'NorthAmerica',
      rateLimit: parseInt(formData.get('rate-limit')) || 50,
      populationId: formData.get('population-id') || ''
    };
    return settings;
  }

  /**
   * Validate settings
   */
  validateSettings(settings) {
    const errors = [];
    if (!settings.environmentId?.trim()) {
      errors.push('Environment ID is required');
    }
    if (!settings.apiClientId?.trim()) {
      errors.push('API Client ID is required');
    }
    if (!settings.apiSecret?.trim()) {
      errors.push('API Secret is required');
    }
    if (!settings.region?.trim()) {
      errors.push('Region is required');
    }
    if (settings.rateLimit && (settings.rateLimit < 1 || settings.rateLimit > 1000)) {
      errors.push('Rate limit must be between 1 and 1000');
    }
    if (errors.length > 0) {
      const errorMessage = 'Validation failed: ' + errors.join(', ');
      this.logger.error('Settings validation failed', {
        errors
      });
      this.uiManager.showSettingsActionStatus(errorMessage, 'error', {
        autoHide: false
      });
      return false;
    }
    return true;
  }

  /**
   * Populate settings form with current values
   */
  populateSettingsForm(settings) {
    if (!settings) return;
    const fields = {
      'environment-id': settings.environmentId,
      'api-client-id': settings.apiClientId,
      'api-secret': settings.apiSecret,
      'region': settings.region,
      'rate-limit': settings.rateLimit,
      'population-id': settings.populationId
    };
    Object.entries(fields).forEach(_ref => {
      let [fieldId, value] = _ref;
      const field = document.getElementById(fieldId);
      if (field && value !== undefined && value !== null) {
        field.value = value;
      }
    });
    this.logger.info('Settings form populated with current values');
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      this.logger.info('Testing connection...');
      this.uiManager.showSettingsActionStatus('Testing connection...', 'info');
      const settings = this.getFormData();

      // Validate required fields
      if (!settings.environmentId || !settings.apiClientId || !settings.apiSecret || !settings.region) {
        this.uiManager.showSettingsActionStatus('Please fill in all required fields', 'error');
        this.updateConnectionStatus('❌ Missing credentials', 'error');
        return;
      }

      // Test connection via API - POST request with credentials
      const response = await this.localClient.post('/api/pingone/test-connection', {
        environmentId: settings.environmentId,
        clientId: settings.apiClientId,
        clientSecret: settings.apiSecret,
        region: settings.region
      });
      if (response.success) {
        this.uiManager.showSettingsActionStatus('Connection test successful', 'success', {
          autoHideDelay: 3000
        });
        this.updateConnectionStatus('✅ Connection successful', 'success');
      } else {
        this.uiManager.showSettingsActionStatus('Connection test failed: ' + (response.error || response.message), 'error');
        this.updateConnectionStatus('❌ Connection failed', 'error');
      }
    } catch (error) {
      this.logger.error('Connection test failed', error);
      this.uiManager.showSettingsActionStatus('Connection test failed: ' + error.message, 'error');
      this.updateConnectionStatus('❌ Connection failed', 'error');
    }
  }

  /**
   * Get token
   */
  async getToken() {
    try {
      this.logger.info('Getting token...');
      this.uiManager.showSettingsActionStatus('Getting token...', 'info');
      const settings = this.getFormData();

      // Get token via API
      const response = await this.localClient.post('/api/v1/auth/token', settings);
      if (response.success) {
        this.uiManager.showSettingsActionStatus('Token obtained successfully', 'success', {
          autoHideDelay: 3000
        });
        this.updateConnectionStatus('✅ Token obtained', 'success');

        // NEW: Direct global token status updater for sidebar
        (this.logger?.debug || window.logger?.debug || console.log)('🚀 [DEBUG] SettingsSubsystem: About to call updateGlobalTokenStatusDirect');
        try {
          // Get the main app instance to call the direct updater
          if (window.app && typeof window.app.updateGlobalTokenStatusDirect === 'function') {
            // Calculate time left from token response
            const timeLeft = response.timeLeft || response.timeRemaining || '';
            window.app.updateGlobalTokenStatusDirect(timeLeft);
            (this.logger?.debug || window.logger?.debug || console.log)('✅ [DEBUG] SettingsSubsystem: updateGlobalTokenStatusDirect called successfully with timeLeft:', timeLeft);
          } else {
            (this.logger?.warn || window.logger?.warn || console.warn)('⚠️ [DEBUG] SettingsSubsystem: window.app.updateGlobalTokenStatusDirect not available');
          }
        } catch (error) {
          (this.logger?.error || window.logger?.error || console.error)('❌ [DEBUG] SettingsSubsystem: Error calling updateGlobalTokenStatusDirect:', error);
        }

        // Emit event for other subsystems
        if (this.eventBus) {
          this.eventBus.emit('tokenObtained', {
            token: response.token
          });
        }
      } else {
        this.uiManager.showSettingsActionStatus('Failed to get token: ' + response.message, 'error');
        this.updateConnectionStatus('❌ Token failed', 'error');
      }
    } catch (error) {
      this.logger.error('Failed to get token', error);
      this.uiManager.showSettingsActionStatus('Failed to get token: ' + error.message, 'error');
      this.updateConnectionStatus('❌ Token failed', 'error');
    }
  }

  /**
   * Toggle API secret visibility
   */
  toggleSecretVisibility() {
    const secretField = document.getElementById('api-secret');
    const toggleBtn = document.getElementById('toggle-api-secret-visibility');
    const icon = toggleBtn?.querySelector('i');
    if (secretField && toggleBtn && icon) {
      if (secretField.type === 'password') {
        secretField.type = 'text';
        icon.className = 'fas fa-eye-slash';
        toggleBtn.setAttribute('aria-label', 'Hide password');
      } else {
        secretField.type = 'password';
        icon.className = 'fas fa-eye';
        toggleBtn.setAttribute('aria-label', 'Show password');
      }
    }
  }

  /**
   * Update connection status display
   */
  updateConnectionStatus(message, type) {
    const statusElement = document.getElementById('settings-connection-status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `connection-status status-${type}`;
    }
  }

  /**
   * Set up cross-subsystem event listeners
   */
  setupCrossSubsystemEvents() {
    if (!this.eventBus) {
      this.logger.warn('EventBus not available for cross-subsystem events');
      return;
    }

    // Listen for token expiration events
    this.eventBus.on('tokenExpired', data => {
      this.logger.warn('Token expired');
      this.updateConnectionStatus('⚠️ Token expired', 'warning');
    });

    // Listen for token error events
    this.eventBus.on('tokenError', data => {
      this.logger.error('Token error detected', data);
      this.updateConnectionStatus('❌ Token error', 'error');
    });

    // Listen for token refresh events
    this.eventBus.on('tokenRefreshed', data => {
      this.logger.info('Token refreshed successfully');
      this.updateConnectionStatus('✅ Token refreshed', 'success');
    });
    this.logger.debug('Cross-subsystem event listeners set up for SettingsSubsystem');
  }

  /**
   * Get all settings (required by App initialization)
   * @returns {Object} All current settings
   */
  getAllSettings() {
    if (this.settingsManager && this.settingsManager.getAllSettings) {
      return this.settingsManager.getAllSettings();
    } else if (this.settingsManager && this.settingsManager.getSettings) {
      return this.settingsManager.getSettings();
    } else if (this.currentSettings) {
      return this.currentSettings;
    } else {
      this.logger.warn('No settings available, returning empty object');
      return {};
    }
  }
}
var _default = exports.default = SettingsSubsystem;

},{}],59:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ViewManagementSubsystem = void 0;
/**
 * View Management Subsystem
 * 
 * Handles all view transitions, navigation, and view-specific initialization.
 * Manages the single-page application navigation and view state.
 */

class ViewManagementSubsystem {
  constructor(logger, uiManager) {
    this.logger = logger;
    this.uiManager = uiManager;

    // View state management
    this.currentView = 'home';
    this.previousView = null;
    this.viewHistory = [];
    this.viewInitializers = new Map();
    this.logger.info('View Management Subsystem initialized with default home view');
  }

  /**
   * Initialize the view management subsystem
   */
  async init() {
    try {
      this.setupNavigationListeners();
      this.registerViewInitializers();
      await this.showInitialView();
      this.logger.info('View Management Subsystem initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize View Management Subsystem', error);
      throw error;
    }
  }

  /**
   * Set up navigation event listeners
   */
  setupNavigationListeners() {
    // Navigation items
    const navItems = document.querySelectorAll('[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', async e => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        await this.showView(view);
      });
    });

    // Browser back/forward buttons
    window.addEventListener('popstate', e => {
      if (e.state && e.state.view) {
        this.showView(e.state.view, false);
      }
    });

    // Keyboard navigation
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey) {
        this.handleKeyboardNavigation(e);
      }
    });
  }

  /**
   * Register view initializers
   */
  registerViewInitializers() {
    // Import view initializer
    this.viewInitializers.set('import', async () => {
      await this.initializeImportView();
    });

    // Export view initializer
    this.viewInitializers.set('export', async () => {
      await this.initializeExportView();
    });

    // Modify view initializer
    this.viewInitializers.set('modify', async () => {
      await this.initializeModifyView();
    });

    // Delete view initializer
    this.viewInitializers.set('delete-csv', async () => {
      await this.initializeDeleteView();
    });

    // Settings view initializer
    this.viewInitializers.set('settings', async () => {
      await this.initializeSettingsView();
    });

    // Logs view initializer
    this.viewInitializers.set('logs', async () => {
      await this.initializeLogsView();
    });

    // History view initializer
    this.viewInitializers.set('history', async () => {
      await this.initializeHistoryView();
    });

    // Analytics view initializer
    this.viewInitializers.set('analytics', async () => {
      await this.initializeAnalyticsView();
    });
  }

  /**
   * Show a specific view
   */
  async showView(view) {
    let updateHistory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
    if (!view || view === this.currentView) {
      return;
    }
    try {
      this.logger.info('Switching to view', {
        from: this.currentView,
        to: view
      });

      // Validate view exists
      if (!this.isValidView(view)) {
        if (this.uiManager && typeof this.uiManager.showError === 'function') {
          this.uiManager.showError('Navigation Error', `Invalid view: ${view}`);
        }
        return;
      }

      // Store previous view
      this.previousView = this.currentView;

      // Hide current view
      this.hideCurrentView();

      // Show new view
      await this.displayView(view);

      // Update navigation state
      this.updateNavigationState(view);

      // Update browser history
      if (updateHistory) {
        this.updateBrowserHistory(view);
      }

      // Initialize view-specific logic
      await this.initializeView(view);

      // Update view state
      this.currentView = view;
      this.viewHistory.push(view);

      // Update page title
      this.updatePageTitle(view);

      // Trigger view change event
      this.triggerViewChangeEvent(view, this.previousView);
    } catch (error) {
      this.logger.error('Failed to switch view', {
        view,
        error: error.message
      });
      if (this.uiManager && typeof this.uiManager.showError === 'function') {
        this.uiManager.showError('Navigation Error', `Failed to switch to ${view} view: ${error.message}`);
      }
    }
  }

  /**
   * Hide the current view
   */
  hideCurrentView() {
    const currentViewElement = document.getElementById(`${this.currentView}-view`);
    if (currentViewElement) {
      currentViewElement.style.display = 'none';
      currentViewElement.classList.remove('active');
    }
  }

  /**
   * Display the specified view
   */
  async displayView(view) {
    const viewElement = document.getElementById(`${view}-view`);
    if (!viewElement) {
      throw new Error(`View element not found: ${view}-view`);
    }

    // Show view with animation
    viewElement.style.display = 'block';
    viewElement.classList.add('active');

    // Add fade-in animation
    viewElement.style.opacity = '0';
    viewElement.style.transition = 'opacity 0.3s ease-in-out';

    // Trigger reflow and fade in
    requestAnimationFrame(() => {
      viewElement.style.opacity = '1';
    });
  }

  /**
   * Update navigation state
   */
  updateNavigationState(view) {
    // Update navigation items
    const navItems = document.querySelectorAll('[data-view]');
    navItems.forEach(item => {
      const itemView = item.getAttribute('data-view');
      if (itemView === view) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update page title
    this.updatePageTitle(view);
  }

  /**
   * Update browser history
   */
  updateBrowserHistory(view) {
    const state = {
      view,
      timestamp: Date.now()
    };
    const title = this.getViewTitle(view);
    const url = `#${view}`;
    history.pushState(state, title, url);
  }

  /**
   * Initialize view-specific functionality
   */
  async initializeView(view) {
    const initializer = this.viewInitializers.get(view);
    if (initializer) {
      try {
        await initializer();
      } catch (error) {
        this.logger.error('View initialization failed', {
          view,
          error: error.message
        });
      }
    }
  }

  /**
   * Initialize import view
   */
  async initializeImportView() {
    // Load populations for import dropdown
    if (window.app && typeof window.app.loadPopulations === 'function') {
      await window.app.loadPopulations('import-population-select');
    }

    // Reset file input
    const fileInput = document.getElementById('csv-file');
    if (fileInput) {
      fileInput.value = '';
    }

    // Reset progress display
    this.resetProgressDisplay();
  }

  /**
   * Initialize export view
   * CRITICAL: This method initializes the export view and loads populations
   * DO NOT change the subsystem reference path without verifying App class structure
   * Last fixed: 2025-07-21 - Fixed incorrect reference to export manager
   */
  async initializeExportView() {
    this.logger.debug('🔄 VIEW: Initializing export view...');

    // Load populations for export dropdown using correct subsystem reference
    if (window.app && window.app.subsystems && window.app.subsystems.exportManager) {
      this.logger.debug('🔄 VIEW: Found export manager, loading populations...');
      if (typeof window.app.subsystems.exportManager.loadPopulations === 'function') {
        await window.app.subsystems.exportManager.loadPopulations();
        this.logger.info('🔄 VIEW: Export populations loaded successfully');
      } else {
        this.logger.error('🔄 VIEW: Export manager loadPopulations method not found');
      }
    } else {
      this.logger.error('🔄 VIEW: Export manager not found in app subsystems', {
        hasApp: !!window.app,
        hasSubsystems: !!(window.app && window.app.subsystems),
        availableSubsystems: window.app && window.app.subsystems ? Object.keys(window.app.subsystems) : []
      });
    }
  }

  /**
   * Initialize modify view
   */
  async initializeModifyView() {
    // Load populations for modify dropdown
    if (window.app && typeof window.app.loadPopulations === 'function') {
      await window.app.loadPopulations('modify-population-select');
    }

    // Reset file input
    const fileInput = document.getElementById('modify-csv-file');
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Initialize delete view
   */
  async initializeDeleteView() {
    // Load populations for delete dropdown
    if (window.deleteManager && typeof window.deleteManager.loadPopulations === 'function') {
      await window.deleteManager.loadPopulations();
    }
  }

  /**
   * Initialize settings view
   */
  async initializeSettingsView() {
    // Load current settings
    if (window.app && typeof window.app.loadSettings === 'function') {
      await window.app.loadSettings();
    }
  }

  /**
   * Initialize logs view
   */
  async initializeLogsView() {
    // Load logs
    if (window.logManager && typeof window.logManager.loadLogs === 'function') {
      await window.logManager.loadLogs();
    }
  }

  /**
   * Initialize history view
   */
  async initializeHistoryView() {
    try {
      // Initialize history UI component if available
      if (this.app && this.app.subsystems && this.app.subsystems.history) {
        this.logger.debug('Initializing history view with HistorySubsystem');

        // The history UI component will be initialized by the main app
        // Just ensure the view container exists
        const historyView = document.getElementById('history-view');
        if (!historyView) {
          this.logger.warn('History view container not found');
        }
      } else {
        this.logger.warn('HistorySubsystem not available for history view initialization');
      }
    } catch (error) {
      this.logger.error('Failed to initialize history view:', error);
    }
  }

  /**
   * Initialize analytics view
   */
  async initializeAnalyticsView() {
    try {
      this.logger.debug('Initializing analytics view');

      // Check if analytics dashboard is available
      if (window.app && window.app.analyticsDashboardUI) {
        this.logger.debug('Analytics dashboard UI available, ensuring visibility');

        // Make sure analytics dashboard is visible when analytics view is shown
        const analyticsContainer = document.getElementById('analytics-dashboard');
        if (analyticsContainer) {
          analyticsContainer.style.display = 'block';
          this.logger.debug('Analytics dashboard container made visible');
        } else {
          this.logger.warn('Analytics dashboard container not found');
        }
      } else {
        this.logger.warn('Analytics dashboard UI not available for analytics view initialization');
      }
    } catch (error) {
      this.logger.error('Failed to initialize analytics view:', error);
    }
  }

  /**
   * Show initial view based on URL hash or default
   */
  async showInitialView() {
    let initialView = 'home';

    // Check URL hash for the initial view
    const hash = window.location.hash.substring(1);
    if (hash && this.isValidView(hash)) {
      initialView = hash;
    }
    await this.showView(initialView, false);
  }

  /**
   * Check if view is valid
   */
  isValidView(view) {
    const validViews = ['home', 'import', 'export', 'modify', 'delete-csv', 'settings', 'logs', 'history', 'analytics'];
    return validViews.includes(view);
  }

  /**
   * Get view title
   */
  getViewTitle(view) {
    const titles = {
      'import': 'Import Users',
      'export': 'Export Users',
      'modify': 'Modify Users',
      'delete-csv': 'Delete Users',
      'settings': 'Settings',
      'logs': 'Logs',
      'history': 'History',
      'analytics': 'Analytics Dashboard'
    };
    return titles[view] || 'PingOne Import Tool';
  }

  /**
   * Update page title
   */
  updatePageTitle(view) {
    const title = this.getViewTitle(view);
    document.title = `${title} - PingOne Import Tool`;
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(e) {
    const keyMap = {
      '1': 'import',
      '2': 'export',
      '3': 'modify',
      '4': 'delete-csv',
      '5': 'settings',
      '6': 'logs',
      '7': 'history'
    };
    const view = keyMap[e.key];
    if (view) {
      e.preventDefault();
      this.showView(view);
    }
  }

  /**
   * Reset progress display
   */
  resetProgressDisplay() {
    // Use uiManager to hide progress and reset bar
    if (this.uiManager && typeof this.uiManager.hideProgress === 'function') {
      this.uiManager.hideProgress();
    }
    if (this.uiManager && typeof this.uiManager.updateProgress === 'function') {
      this.uiManager.updateProgress(0, 1, ''); // Reset bar
    }
  }

  /**
   * Trigger view change event
   */
  triggerViewChangeEvent(newView, oldView) {
    const event = new CustomEvent('viewChanged', {
      detail: {
        newView,
        oldView,
        timestamp: Date.now()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Go back to previous view
   */
  async goBack() {
    if (this.previousView) {
      await this.showView(this.previousView);
    }
  }

  /**
   * Get current view
   */
  getCurrentView() {
    return this.currentView;
  }

  /**
   * Get view history
   */
  getViewHistory() {
    return [...this.viewHistory];
  }

  /**
   * Clear view history
   */
  clearViewHistory() {
    this.viewHistory = [];
  }
}
exports.ViewManagementSubsystem = ViewManagementSubsystem;

},{}],60:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BrowserLoggingService = void 0;
exports.createLogger = createLogger;
exports.logger = exports.default = void 0;
/**
 * Browser-Compatible Logging Service
 * 
 * Provides unified logging for browser environment with:
 * - Correlation IDs for request tracking
 * - Structured logging with metadata
 * - Console and server transports
 * - Log level filtering
 * - Performance monitoring
 */

class BrowserLoggingService {
  constructor() {
    let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.serviceName = options.serviceName || 'pingone-import-client';
    this.environment = options.environment || 'development';
    this.logLevel = options.logLevel || this.getDefaultLogLevel();
    this.enableConsole = options.enableConsole !== false;
    this.enableServer = options.enableServer !== false;

    // Log levels hierarchy
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Correlation ID for request tracking
    this.correlationId = this.generateCorrelationId();

    // Performance tracking
    this.performanceMarks = new Map();
    this.initializeTransports();
  }

  /**
   * Get default log level based on environment
   */
  getDefaultLogLevel() {
    switch (this.environment) {
      case 'production':
        return 'info';
      case 'test':
        return 'warn';
      default:
        return 'debug';
    }
  }

  /**
   * Generate correlation ID for request tracking
   */
  generateCorrelationId() {
    return `${this.serviceName}-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  }

  /**
   * Initialize logging transports
   */
  initializeTransports() {
    this.transports = [];
    if (this.enableConsole) {
      this.transports.push({
        name: 'console',
        log: this.logToConsole.bind(this)
      });
    }
    if (this.enableServer) {
      this.transports.push({
        name: 'server',
        log: this.logToServer.bind(this)
      });
    }
  }

  /**
   * Check if log level should be processed
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Format log entry with metadata
   */
  formatLogEntry(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    return {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      service: this.serviceName,
      environment: this.environment,
      correlationId: this.correlationId,
      source: 'client',
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...meta
    };
  }

  /**
   * Log to console with formatting
   */
  logToConsole(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!this.shouldLog(level)) return;
    const entry = this.formatLogEntry(level, message, meta);
    const timestamp = entry.timestamp;
    const correlationId = entry.correlationId.slice(-8);
    let consoleMessage = `[${timestamp}] [${correlationId}] [${entry.service}] ${level.toUpperCase()}: ${message}`;
    if (Object.keys(meta).length > 0) {
      consoleMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    switch (level) {
      case 'error':
        console.error(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'info':
        console.info(consoleMessage);
        break;
      case 'debug':
        console.debug(consoleMessage);
        break;
      default:
        console.log(consoleMessage);
    }
  }

  /**
   * Log to server via API endpoint
   */
  async logToServer(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    try {
      const entry = this.formatLogEntry(level, message, meta);
      await fetch('/api/logs/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Silently fail to avoid infinite loops
      if (this.enableConsole) {
        console.warn('Failed to send log to server:', error.message);
      }
    }
  }

  /**
   * Main logging method
   */
  log(level, message) {
    let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    if (!this.shouldLog(level)) return;
    this.transports.forEach(transport => {
      try {
        transport.log(level, message, meta);
      } catch (error) {
        console.error(`Error in ${transport.name} transport:`, error);
      }
    });
  }

  /**
   * Convenience methods
   */
  error(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('error', message, meta);
  }
  warn(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('warn', message, meta);
  }
  info(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('info', message, meta);
  }
  debug(message) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('debug', message, meta);
  }

  /**
   * Performance monitoring
   */
  startTimer(label) {
    this.performanceMarks.set(label, performance.now());
    this.debug(`Timer started: ${label}`);
  }
  endTimer(label) {
    let meta = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    const startTime = this.performanceMarks.get(label);
    if (!startTime) {
      this.warn(`Timer not found: ${label}`);
      return 0;
    }
    const duration = performance.now() - startTime;
    this.performanceMarks.delete(label);
    this.info(`Timer completed: ${label}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...meta
    });
    return duration;
  }

  /**
   * Create child logger with additional context
   */
  child() {
    let additionalMeta = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const childLogger = new BrowserLoggingService({
      serviceName: this.serviceName,
      environment: this.environment,
      logLevel: this.logLevel,
      enableConsole: this.enableConsole,
      enableServer: this.enableServer
    });

    // Override formatLogEntry to include additional metadata
    const originalFormatLogEntry = childLogger.formatLogEntry.bind(childLogger);
    childLogger.formatLogEntry = function (level, message) {
      let meta = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      return originalFormatLogEntry(level, message, {
        ...additionalMeta,
        ...meta
      });
    };
    return childLogger;
  }

  /**
   * Set correlation ID (useful for request tracking)
   */
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId() {
    return this.correlationId;
  }
}

/**
 * Create logger instance
 */
exports.BrowserLoggingService = BrowserLoggingService;
function createLogger() {
  let options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return new BrowserLoggingService(options);
}

/**
 * Default logger instance
 */
const logger = exports.logger = createLogger({
  serviceName: 'pingone-import-client'
});
var _default = exports.default = BrowserLoggingService;

},{}],61:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CryptoUtils = void 0;
/**
 * @file Cryptographic utilities for client-side data protection.
 */

class CryptoUtils {
  /**
   * A simple placeholder for an encryption function.
   * In a real application, this would use a robust library like CryptoJS.
   * @param {string} text The text to encrypt.
   * @param {string} secret The secret key.
   * @returns {string} The encrypted text (currently just base64 encoded).
   */
  static encrypt(text, secret) {
    if (!text || !secret) {
      console.warn('CryptoUtils: Encryption requires text and a secret.');
      return text;
    }
    // This is not real encryption. It's a placeholder to satisfy the dependency.
    try {
      return btoa(`${secret}:${text}`);
    } catch (e) {
      console.error('Failed to encode data:', e);
      return text;
    }
  }

  /**
   * Generate a simple key for encryption/decryption.
   * In a real application, this would use a cryptographically secure random generator.
   * @param {number} length The length of the key to generate.
   * @returns {string} A generated key.
   */
  static generateKey() {
    let length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 32;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * A simple placeholder for a decryption function.
   * @param {string} encryptedText The text to decrypt.
   * @param {string} secret The secret key.
   * @returns {string|null} The decrypted text or null if it fails.
   */
  static decrypt(encryptedText, secret) {
    if (!encryptedText || !secret) {
      console.warn('CryptoUtils: Decryption requires text and a secret.');
      return encryptedText;
    }
    // This is not real decryption.
    try {
      const decoded = atob(encryptedText);
      const [prefix, ...rest] = decoded.split(':');
      if (prefix === secret) {
        return rest.join(':');
      }
      return null; // Secret doesn't match
    } catch (e) {
      console.error('Failed to decode data:', e);
      return encryptedText; // Return original if decoding fails
    }
  }
}
exports.CryptoUtils = CryptoUtils;

},{}],62:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.eventBus = exports.default = exports.EventBus = void 0;
// event-bus.js
// Simple EventBus utility for cross-subsystem communication

class EventBus {
  constructor() {
    this.events = {};
  }
  on(event, handler) {
    (this.events[event] = this.events[event] || []).push(handler);
  }
  off(event, handler) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(h => h !== handler);
  }
  emit(event, data) {
    (this.events[event] || []).forEach(h => h(data));
  }
}

// Create and export a default instance
exports.EventBus = EventBus;
const eventBus = exports.eventBus = new EventBus();

// Export both the class and the default instance
var _default = exports.default = eventBus; // Browser global fallback for legacy compatibility
if (typeof window !== 'undefined') {
  window.EventBus = EventBus;
  window.eventBus = eventBus;
}

},{}],63:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FileLogger = void 0;
/**
 * FileLogger - Handles writing logs to a client.log file using the File System Access API
 */
class FileLogger {
  /**
   * Create a new FileLogger instance
   * @param {string} filename - Name of the log file (default: 'client.log')
   */
  constructor() {
    let filename = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'client.log';
    this.filename = filename;
    this.fileHandle = null;
    this.writableStream = null;
    this.initialized = false;
    this.logQueue = [];
    this.initializationPromise = null;
  }

  /**
   * Initialize the file logger
   * @private
   */
  async _initialize() {
    if (this.initialized) return true;
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializationPromise = (async () => {
      try {
        // Check if we're in a secure context and the API is available
        if (!window.isSecureContext || !window.showSaveFilePicker) {
          throw new Error('File System Access API not available in this context');
        }

        // Only proceed if we're handling a user gesture
        if (!window.__fileLoggerUserGesture) {
          // Set up event listeners
          window.addEventListener('online', () => this.handleOnline());
          window.addEventListener('offline', () => this.handleOffline());

          // Set up user gesture detection for file logger
          const handleUserGesture = () => {
            window.__fileLoggerUserGesture = true;
            window.removeEventListener('click', handleUserGesture);
            window.removeEventListener('keydown', handleUserGesture);

            // Try to initialize the file logger if it hasn't been initialized yet
            if (this.fileLogger && !this.fileLogger._initialized && this.fileLogger._logger === null) {
              this.fileLogger._ensureInitialized().catch(console.warn);
            }
          };
          window.addEventListener('click', handleUserGesture, {
            once: true,
            passive: true
          });
          window.addEventListener('keydown', handleUserGesture, {
            once: true,
            passive: true
          });
          throw new Error('Waiting for user gesture to initialize file logger');
        }
        try {
          this.fileHandle = await window.showSaveFilePicker({
            suggestedName: this.filename,
            types: [{
              description: 'Log File',
              accept: {
                'text/plain': ['.log']
              }
            }],
            excludeAcceptAllOption: true
          });
          this.writableStream = await this.fileHandle.createWritable({
            keepExistingData: true
          });
          this.initialized = true;
          await this._processQueue();
          return true;
        } catch (error) {
          console.warn('File System Access API not available:', error);
          this.initialized = false;
          return false;
        }
      } catch (error) {
        console.warn('File logger initialization deferred:', error.message);
        this.initialized = false;
        return false;
      }
    })();
    return this.initializationPromise;
  }

  /**
   * Process any queued log messages
   * @private
   */
  async _processQueue() {
    if (this.logQueue.length === 0) return;
    const queue = [...this.logQueue];
    this.logQueue = [];
    for (const {
      level,
      message,
      timestamp
    } of queue) {
      await this._writeLog(level, message, timestamp);
    }
  }

  /**
   * Write a log message to the file
   * @private
   */
  async _writeLog(level, message, timestamp) {
    if (!this.initialized) {
      await this._initialize();
    }
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    if (this.writableStream) {
      try {
        await this.writableStream.write(logEntry);
      } catch (error) {
        console.error('Error writing to log file:', error);
        this.initialized = false;
        await this._initialize();
        await this.writableStream.write(logEntry);
      }
    } else {
      console[level](`[FileLogger] ${logEntry}`);
    }
  }

  /**
   * Log a message
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} message - The message to log
   */
  async log(level, message) {
    const timestamp = new Date().toISOString();
    if (!this.initialized) {
      this.logQueue.push({
        level,
        message,
        timestamp
      });
      await this._initialize();
    } else {
      await this._writeLog(level, message, timestamp);
    }
  }

  /**
   * Log an info message
   * @param {string} message - The message to log
   */
  info(message) {
    return this.log('info', message);
  }

  /**
   * Log a warning message
   * @param {string} message - The message to log
   */
  warn(message) {
    return this.log('warn', message);
  }

  /**
   * Log an error message
   * @param {string} message - The message to log
   */
  error(message) {
    return this.log('error', message);
  }

  /**
   * Log a debug message
   * @param {string} message - The message to log
   */
  debug(message) {
    return this.log('debug', message);
  }

  /**
   * Close the log file
   */
  async close() {
    if (this.writableStream) {
      try {
        await this.writableStream.close();
      } catch (error) {
        console.error('Error closing log file:', error);
      } finally {
        this.initialized = false;
        this.writableStream = null;
        this.fileHandle = null;
      }
    }
  }
}
exports.FileLogger = FileLogger;

},{}],64:[function(require,module,exports){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _axios = _interopRequireDefault(require("axios"));
/**
 * A client for making requests to the local application API.
 * It handles prepending the base API path, setting headers,
 * and consistent error handling and logging.
 */
class LocalApiClient {
  /**
   * @param {string} baseURL The base URL for the API (e.g., '/api/v1').
   * @param {Logger} logger A logger instance for logging messages.
   */
  constructor(baseURL, logger) {
    if (!baseURL) {
      throw new Error('LocalApiClient: baseURL is required.');
    }
    if (!logger) {
      throw new Error('LocalApiClient: logger is required.');
    }
    this.client = _axios.default.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    this.logger = logger;
    this.logger.info(`Local API Client initialized for base URL: ${baseURL}`);

    // Add a response interceptor for logging errors
    this.client.interceptors.response.use(response => response, error => {
      this.logger.error('API request failed:', {
        message: error.message,
        url: error.config.url,
        method: error.config.method,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'No response received'
      });
      return Promise.reject(error);
    });
  }

  /**
   * Makes a GET request.
   * @param {string} url The request URL path.
   * @param {object} [config] Axios request config.
   * @returns {Promise<any>} The response data.
   */
  async get(url) {
    let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.logger.debug(`Making GET request to: ${url}`);
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      this.logger.error(`GET request to ${url} failed.`);
      throw error;
    }
  }

  /**
   * Makes a POST request.
   * @param {string} url The request URL path.
   * @param {object} [data] The request body data.
   * @param {object} [config] Axios request config.
   * @returns {Promise<any>} The response data.
   */
  async post(url) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    this.logger.debug(`Making POST request to: ${url}`);
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      this.logger.error(`POST request to ${url} failed.`);
      throw error;
    }
  }

  /**
   * Makes a PUT request.
   * @param {string} url The request URL path.
   * @param {object} [data] The request body data.
   * @param {object} [config] Axios request config.
   * @returns {Promise<any>} The response data.
   */
  async put(url) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    let config = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    this.logger.debug(`Making PUT request to: ${url}`);
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      this.logger.error(`PUT request to ${url} failed.`);
      throw error;
    }
  }

  /**
   * Makes a DELETE request.
   * @param {string} url The request URL path.
   * @param {object} [config] Axios request config.
   * @returns {Promise<any>} The response data.
   */
  async delete(url) {
    let config = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.logger.debug(`Making DELETE request to: ${url}`);
    try {
      const response = await this.client.delete(url, config);
      return response.data;
    } catch (error) {
      this.logger.error(`DELETE request to ${url} failed.`);
      throw error;
    }
  }
}
var _default = exports.default = LocalApiClient;

},{"@babel/runtime/helpers/interopRequireDefault":1,"axios":2}],65:[function(require,module,exports){
(function (process){(function (){
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Logger = void 0;
var _winstonLogger = require("./winston-logger.js");
var _messageFormatter = _interopRequireDefault(require("./message-formatter.js"));
function _interopRequireWildcard(e, t) {
  if ("function" == typeof WeakMap) var r = new WeakMap(),
    n = new WeakMap();
  return (_interopRequireWildcard = function (e, t) {
    if (!t && e && e.__esModule) return e;
    var o,
      i,
      f = {
        __proto__: null,
        default: e
      };
    if (null === e || "object" != typeof e && "function" != typeof e) return f;
    if (o = t ? n : r) {
      if (o.has(e)) return o.get(e);
      o.set(e, f);
    }
    for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]);
    return f;
  })(e, t);
} /**
  * @fileoverview Winston-compatible logger for frontend environment
  * 
  * This module provides a Winston-like logging interface for the frontend
  * that maintains consistency with server-side Winston logging while
  * working within browser constraints.
  * 
  * Features:
  * - Winston-compatible API (info, warn, error, debug)
  * - Structured logging with metadata
  * - Timestamp formatting
  * - Log level filtering
  * - Console and server transport support
  * - Error stack trace handling
  * - Environment-aware configuration
  */
// import { UIManager } from './ui-manager.js'; // Removed to break circular dependency
const ui = window.app && window.app.uiManager;

/**
 * Winston-compatible logger for browser environment
 */
class Logger {
  constructor() {
    let logElement = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
    this.logElement = logElement;
    this.logs = [];
    this.validCount = 0;
    this.errorCount = 0;
    this.initialized = false;
    this.serverLoggingEnabled = true;
    this.isLoadingLogs = false;
    this.offlineLogs = [];
    this.childMetadata = {};

    // Initialize Winston-compatible logger
    this.winstonLogger = (0, _winstonLogger.createWinstonLogger)({
      service: 'pingone-import-frontend',
      environment: process.env.NODE_ENV || 'development',
      enableServerLogging: true,
      enableConsoleLogging: true
    });
    this.initialize();
  }

  /**
   * Initialize the logger
   */
  initialize() {
    try {
      this.winstonLogger.info('Logger initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  /**
   * Temporarily disable server logging to prevent feedback loops
   */
  disableServerLogging() {
    this.serverLoggingEnabled = false;
    this.winstonLogger.setServerLogging(false);
    this.winstonLogger.debug('Server logging disabled');
  }

  /**
   * Re-enable server logging
   */
  enableServerLogging() {
    this.serverLoggingEnabled = true;
    this.winstonLogger.setServerLogging(true);
    this.winstonLogger.debug('Server logging enabled');
  }

  /**
   * Set flag to indicate we're loading logs (prevents server logging)
   */
  setLoadingLogs(isLoading) {
    this.isLoadingLogs = isLoading;
    this.winstonLogger.debug(`Loading logs flag set to: ${isLoading}`);
  }

  /**
   * Create a safe file logger that handles initialization and errors
   * @private
   */
  _createSafeFileLogger() {
    const logger = {
      _initialized: false,
      _logger: null,
      _queue: [],
      _initializing: false,
      async init() {
        if (this._initialized || this._initializing) return;
        this._initializing = true;
        try {
          // Initialize actual FileLogger for client.log
          const {
            FileLogger
          } = await Promise.resolve().then(() => _interopRequireWildcard(require('./file-logger.js')));
          this._logger = new FileLogger('client.log');
          this._initialized = true;
          this._processQueue();
        } catch (error) {
          console.warn('Failed to initialize file logger, falling back to console:', error.message);
          // Fallback to console logging
          this._logger = {
            log: (level, message, data) => {
              console[level] || console.log(`[${level.toUpperCase()}] ${message}`, data);
            }
          };
          this._initialized = true;
          this._processQueue();
        } finally {
          this._initializing = false;
        }
      },
      _processQueue() {
        while (this._queue.length > 0) {
          const {
            level,
            message,
            data
          } = this._queue.shift();
          if (this._logger && typeof this._logger.log === 'function') {
            this._logger.log(level, message, data);
          }
        }
      },
      log(level, message, data) {
        if (this._initialized && this._logger) {
          this._logger.log(level, message, data);
        } else {
          this._queue.push({
            level,
            message,
            data
          });
          if (!this._initializing) {
            this.init();
          }
        }
      }
    };
    return logger;
  }

  /**
   * Parse log arguments into structured format
   * @private
   */
  _parseLogArgs(args) {
    let message = 'Log message';
    let data = null;
    let context = null;
    if (args.length > 0) {
      if (typeof args[0] === 'string') {
        message = args[0];
        if (args.length > 1 && typeof args[1] === 'object') {
          data = args[1];
          if (args.length > 2 && typeof args[2] === 'object') {
            context = args[2];
          }
        }
      } else if (typeof args[0] === 'object') {
        data = args[0];
        message = 'Log data';
        if (args.length > 1 && typeof args[1] === 'object') {
          context = args[1];
        }
      }
    }
    return [message, data, context];
  }

  /**
   * Main logging method with Winston integration
   */
  log(level, message) {
    let data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    try {
      // Parse arguments if needed
      if (typeof level === 'string' && typeof message === 'string') {
        // Direct call: log(level, message, data)
        this._logToWinston(level, message, data);
      } else {
        // Legacy call: log(message, level)
        const [parsedMessage, parsedData, context] = this._parseLogArgs(arguments);
        this._logToWinston(level || 'info', parsedMessage, {
          ...parsedData,
          ...context
        });
      }

      // Update UI if log element exists
      this._updateLogUI({
        level,
        message,
        data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error in logger.log:', error);
    }
  }

  /**
   * Log to Winston with proper formatting
   * @private
   */
  _logToWinston(level, message) {
    let data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const logData = {
      ...data,
      component: 'frontend-logger',
      timestamp: new Date().toISOString()
    };
    this.winstonLogger.log(level, message, logData);
  }

  /**
   * Log info level message
   */
  info(message) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('info', message, data);
  }

  /**
   * Log warn level message
   */
  warn(message) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('warn', message, data);
  }

  /**
   * Log error level message
   */
  error(message) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('error', message, data);
    if (ui) ui.showStatusBar(message, 'error', {
      autoDismiss: false
    });
    this.errorCount++;
    this.updateSummary();
  }

  /**
   * Log debug level message
   */
  debug(message) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('debug', message, data);
  }

  /**
   * Log success level message
   */
  success(message) {
    let data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    this.log('info', message, {
      ...data,
      type: 'success'
    });
    this.validCount++;
    this.updateSummary();
  }

  /**
   * Log error with stack trace
   */
  errorWithStack(message, error) {
    let data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    this.winstonLogger.errorWithStack(message, error, data);
    this.errorCount++;
    this.updateSummary();
  }

  /**
   * Update log UI with new entry
   * @private
   */
  _updateLogUI(logEntry) {
    // Validate logElement exists and is a DOM element
    if (!this.logElement || !this.logElement.appendChild || typeof this.logElement.appendChild !== 'function') {
      return;
    }
    try {
      const logElement = document.createElement('div');
      logElement.className = `log-entry ${logEntry.level}`;

      // Create timestamp
      const timestamp = document.createElement('span');
      timestamp.className = 'log-timestamp';
      timestamp.textContent = new Date(logEntry.timestamp).toLocaleTimeString();
      logElement.appendChild(timestamp);

      // Create level badge
      const levelBadge = document.createElement('span');
      levelBadge.className = 'log-level';
      levelBadge.textContent = logEntry.level.toUpperCase();
      logElement.appendChild(levelBadge);

      // Create message with formatting
      const message = document.createElement('span');
      message.className = 'log-message';

      // Format the message for better readability
      let formattedMessage = logEntry.message;
      if (logEntry.data && logEntry.data.type) {
        // Format based on message type
        switch (logEntry.data.type) {
          case 'progress':
            formattedMessage = _messageFormatter.default.formatProgressMessage(logEntry.data.operation || 'import', logEntry.data.current || 0, logEntry.data.total || 0, logEntry.message, logEntry.data.counts || {});
            break;
          case 'error':
            formattedMessage = _messageFormatter.default.formatErrorMessage(logEntry.data.operation || 'import', logEntry.message, logEntry.data);
            break;
          case 'completion':
            formattedMessage = _messageFormatter.default.formatCompletionMessage(logEntry.data.operation || 'import', logEntry.data);
            break;
          default:
            // Use original message for other types
            formattedMessage = logEntry.message;
        }
      }
      message.textContent = formattedMessage;
      logElement.appendChild(message);

      // Add details if present
      if (logEntry.data && Object.keys(logEntry.data).length > 0) {
        const detailsElement = document.createElement('div');
        detailsElement.className = 'log-details';
        const detailsTitle = document.createElement('h4');
        detailsTitle.textContent = 'Details';
        detailsElement.appendChild(detailsTitle);
        const detailsContent = document.createElement('pre');
        detailsContent.className = 'log-detail-json';
        detailsContent.textContent = JSON.stringify(logEntry.data, null, 2);
        detailsElement.appendChild(detailsContent);
        logElement.appendChild(detailsElement);
      }

      // Insert at top (newest first)
      if (this.logElement.firstChild) {
        this.logElement.insertBefore(logElement, this.logElement.firstChild);
      } else {
        this.logElement.appendChild(logElement);
      }

      // Auto-scroll to top
      this.logElement.scrollTop = 0;

      // Limit UI logs
      const maxUILogs = 100;
      while (this.logElement.children.length > maxUILogs) {
        this.logElement.removeChild(this.logElement.lastChild);
      }
    } catch (error) {
      console.error('Error updating log UI:', error);
    }
  }

  /**
   * Send log to server
   * @private
   */
  async _sendToServer(logEntry) {
    if (!this.serverLoggingEnabled || this.isLoadingLogs) {
      return;
    }
    try {
      await fetch('/api/logs/ui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: logEntry.level,
          message: logEntry.message,
          data: logEntry.data
        })
      });
    } catch (error) {
      this.winstonLogger.warn('Failed to send log to server', {
        error: error.message
      });
      this.offlineLogs.push(logEntry);
    }
  }

  /**
   * Render all logs to UI
   */
  renderLogs() {
    if (!this.logElement) return;
    this.logElement.innerHTML = '';
    this.logs.forEach(log => this._updateLogUI(log));
    this.logElement.scrollTop = this.logElement.scrollHeight;
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
    if (this.logElement) {
      this.logElement.innerHTML = '';
    }
    this.winstonLogger.info('Logs cleared');
  }

  /**
   * Get all logs
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Update summary display
   */
  updateSummary() {
    // Implementation depends on UI structure
    this.winstonLogger.debug('Summary updated', {
      validCount: this.validCount,
      errorCount: this.errorCount
    });
  }

  /**
   * Clear summary
   */
  clearSummary() {
    this.validCount = 0;
    this.errorCount = 0;
    this.winstonLogger.debug('Summary cleared');
  }

  /**
   * Start a performance timer
   */
  startTimer(label) {
    if (!this.timers) {
      this.timers = new Map();
    }
    this.timers.set(label, Date.now());
    this.debug(`Timer started: ${label}`);
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(label) {
    if (!this.timers || !this.timers.has(label)) {
      this.warn(`Timer '${label}' not found`);
      return 0;
    }
    const startTime = this.timers.get(label);
    const duration = Date.now() - startTime;
    this.timers.delete(label);
    this.info(`Timer completed: ${label}`, {
      duration: `${duration}ms`
    });
    return duration;
  }

  /**
   * Create a child logger with additional context
   * This mimics Winston's child logger functionality
   */
  child() {
    let metadata = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    const childLogger = new Logger(this.logElement);

    // Copy parent configuration
    childLogger.serverLoggingEnabled = this.serverLoggingEnabled;
    childLogger.isLoadingLogs = this.isLoadingLogs;
    childLogger.winstonLogger = this.winstonLogger;

    // Store child metadata for all log calls
    childLogger.childMetadata = {
      ...this.childMetadata,
      ...metadata
    };

    // Override log method to include child metadata
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = function (level, message) {
      let data = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      const mergedData = {
        ...this.childMetadata,
        ...data
      };
      return originalLog(level, message, mergedData);
    };
    return childLogger;
  }
}

// Export the Logger class
exports.Logger = Logger;

}).call(this)}).call(this,require('_process'))
},{"./file-logger.js":63,"./message-formatter.js":66,"./winston-logger.js":68,"@babel/runtime/helpers/interopRequireDefault":1,"_process":37}],66:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * @file A utility for formatting log messages.
 */

class MessageFormatter {
  /**
   * Formats a log message with a timestamp and level.
   * @param {string} level The log level (e.g., 'INFO', 'ERROR').
   * @param {string} message The log message.
   * @param {object} [metadata] Optional metadata to include.
   * @returns {string} The formatted log message.
   */
  format(level, message) {
    let metadata = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    if (metadata && Object.keys(metadata).length > 0) {
      try {
        const metadataString = JSON.stringify(metadata, null, 2);
        formattedMessage += `\n${metadataString}`;
      } catch (error) {
        // In case of circular references in metadata
        formattedMessage += `\n[Could not stringify metadata]`;
      }
    }
    return formattedMessage;
  }
}
var _default = exports.default = MessageFormatter;

},{}],67:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
/**
 * @file A client for making requests to the PingOne API via the local server proxy.
 */

class PingOneClient {
  /**
   * @param {LocalApiClient} localClient An instance of the local API client.
   * @param {Logger} logger A logger instance.
   */
  constructor(localClient, logger) {
    if (!localClient || !logger) {
      throw new Error('PingOneClient: localClient and logger are required.');
    }
    this.localClient = localClient;
    this.logger = logger.child({
      client: 'PingOneClient'
    });
    this.logger.info('PingOneClient initialized.');
  }

  /**
   * Fetches an access token from the server.
   * @returns {Promise<object>} The token data.
   */
  async getAccessToken() {
    this.logger.debug('Requesting new access token...');
    try {
      const tokenData = await this.localClient.get('/pingone/get-token');
      this.logger.info('Successfully retrieved access token.');
      return tokenData;
    } catch (error) {
      this.logger.error('Failed to get access token.', error);
      throw error;
    }
  }

  /**
   * Tests the connection to the PingOne API.
   * @returns {Promise<object>} The connection test result.
   */
  async testConnection() {
    this.logger.debug('Testing PingOne API connection...');
    try {
      const result = await this.localClient.get('/pingone/test-connection');
      this.logger.info('Connection test completed.');
      return result;
    } catch (error) {
      this.logger.error('Connection test failed.', error);
      throw error;
    }
  }
}
var _default = exports.default = PingOneClient;

},{}],68:[function(require,module,exports){
arguments[4][45][0].apply(exports,arguments)
},{"_process":37,"dup":45}]},{},[46]);
