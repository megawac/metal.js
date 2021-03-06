(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["lodash"], factory);
  } else if (typeof exports !== "undefined") {
    module.exports = factory(require("lodash"));
  } else {
    root.Metal = factory(root._);
  }
})(this, function (_) {
  "use strict";

  var _slice = Array.prototype.slice;

  /**
   * @module Metal
   */
  var Metal = {};

  /**
   * Wraps the passed method so that `this._super` will point to the superMethod
   * when the method is invoked.
   *
   * @private
   * @method wrap
   * @param {Function} method - The method to call.
   * @param {Function} superMethod - The super method.
   * @return {Function} - wrapped function.
   */
  function wrap(method, superMethod) {
    return function () {
      var prevSuper = this._super;
      this._super = superMethod;
      var ret = method.apply(this, arguments);
      this._super = prevSuper;
      return ret;
    };
  }

  /**
   * A reference to safe regex for checking if a function calls `_super`.
   *
   * @private
   * @const {RegExp}
   */
  var superTest = (/xyz/.test(function () {
    return "xyz";
  })) ? /\b_super\b/ : /.*/;

  /**
   * Assigns properties of source object to destination object, wrapping methods
   * that call their super method.
   *
   * @private
   * @method wrapAll
   * @param {Object} dest - The destination object.
   * @param {Object} source - The source object.
   */
  function wrapAll(dest, source) {
    var keys = _.keys(source), length = keys.length, i, name, method, superMethod, hasSuper;

    // Return if source object is empty
    if (length === 0) {
      return;
    }

    for (i = 0; i < length; i++) {
      name = keys[i];
      method = source[name];
      superMethod = dest[name];

      // Test if new method calls `_super`
      hasSuper = superTest.test(method);

      // Only wrap the new method if the original method was a function and the
      // new method calls `_super`.
      if (hasSuper && _.isFunction(method) && _.isFunction(superMethod)) {
        dest[name] = wrap(method, superMethod);

        // Otherwise just add the new method or property to the object.
      } else {
        dest[name] = method;
      }
    }
  }

  /**
   * Creates a new Class.
   *
   * ```js
   * var MyClass = Class.extend({
   *   initialize() {
   *     console.log('Created!');
   *   }
   * });
   *
   * new MyClass();
   * // >> Created!
   * ```
   *
   * @public
   * @class Class
   * @memberOf Metal
   */
  var Class = Metal.Class = function () {
    this.initialize.apply(this, _slice.call(arguments));
  };

  /**
   * An overridable method called when objects are instantiated. Does not do
   * anything by default.
   *
   * @public
   * @abstract
   * @method initialize
   */
  Class.prototype.initialize = _.noop;

  _.assign(Class, {
    /**
     * Creates a new subclass.
     *
     * ```js
     * var MyClass = Class.extend({
     *   // ...
     * });
     *
     * var myClass = new MyClass();
     * myClass instanceof MyClass
     * // true
     * myClass instanceof Class
     * // true
     * ```
     *
     * @public
     * @static
     * @method extend
     * @param {Object} [protoProps] - The properties to be added to the prototype.
     * @param {Object} [staticProps] - The properties to be added to the constructor.
     */
    extend: function (protoProps, staticProps) {
      var Parent = this;
      var Child;

      // The constructor function for the new subclass is either defined by you
      // (the "constructor" property in your `extend` definition), or defaulted
      // by us to simply call the parent's constructor.
      if (!protoProps || !_.has(protoProps, "constructor")) {
        Child = function () {
          Parent.apply(this, arguments);
        };
      } else if (superTest.test(protoProps.constructor)) {
        Child = wrap(protoProps.constructor, Parent.prototype.constructor);
      } else {
        Child = protoProps.constructor;
      }

      // Add static properties to the constructor function, if supplied.
      _.assign(Child, Parent);
      wrapAll(Child, staticProps);

      // Set the prototype chain to inherit from `parent`, without calling
      // `parent`'s constructor function.
      var Surrogate = function () {
        this.constructor = Child;
      };
      Surrogate.prototype = Parent.prototype;
      Child.prototype = new Surrogate();

      // Add prototype properties (instance properties) to the subclass,
      // if supplied.
      wrapAll(Child.prototype, protoProps);

      // Set a convenience property in case the parent class is needed later.
      Child.superclass = Parent;

      // Set a convenience property in case the parent's prototype is needed
      // later.
      Child.__super__ = Parent.prototype;

      return Child;
    },

    /**
     * Mixes properties onto the class's prototype.
     *
     * ```js
     * var MyMixin = new Mixin({
     *   alert() {
     *     console.log('Alert!');
     *   }
     * });
     *
     * var MyClass = Class.extend({
     *   initialize() {
     *     this.alert();
     *   }
     * });
     *
     * MyClass.mixin(MyMixin);
     *
     * new MyClass();
     * // >> Alert!
     * ```
     *
     * @public
     * @static
     * @method mixin
     * @param {Object} protoProps - The properties to be added to the prototype.
     * @return {Class} - The class.
     */
    mixin: function (protoProps) {
      // Add prototype properties (instance properties) to the class, if supplied.
      wrapAll(this.prototype, protoProps);
      return this;
    },

    /**
     * Mixes properties onto the class's constructor.
     *
     * ```js
     * var MyMixin = new Mixin({
     *   alert() {
     *     console.log('Alert!');
     *   }
     * });
     *
     * var MyClass = Class.extend(...);
     *
     * MyClass.include(MyMixin);
     *
     * MyClass.alert();
     * // >> Alert!
     * ```
     *
     * You can also simply pass a plain javascript object.
     *
     * ```js
     * var MyClass = Class.extend(...);
     *
     * MyClass.include({
     *   alert() {
     *     console.log('Alert!');
     *   }
     * });
     *
     * MyClass.alert();
     * // >> Alert!
     * ```
     *
     * @public
     * @static
     * @method mixin
     * @param {Object} protoProps - The properties to be added to the constructor.
     * @return {Class} - The class.
     */
    include: function (staticProps) {
      // Add static properties to the constructor function, if supplied.
      wrapAll(this, staticProps);
      return this;
    }
  });

  /**
   * Allows you to create mixins, whose properties can be added to other classes.
   *
   * @public
   * @class Mixin
   * @memberOf Metal
   * @param {Object} protoProps - The properties to be added to the prototype.
   */
  var Mixin = Metal.Mixin = function (protoProps) {
    // Add prototype properties (instance properties) to the class, if supplied.
    _.assign(this, protoProps);
  };

  /**
   * @private
   * @const {String[]}
   */
  var errorProps = ["description", "fileName", "lineNumber", "name", "message", "number"];

  /**
   * A subclass of the JavaScript Error. Can also add a url based on the urlRoot.
   *
   * ```js
   * throw new Metal.Error('Oh you\'ve really done it now...');
   * // Uncaught Metal.Error: Oh you've really done it now...
   * //   [stack trace]
   * ```
   *
   * @class Error
   * @memberOf Metal
   * @extends Error
   * @uses Metal.Class
   */
  var Err = Metal.Error = Class.extend.call(Error, {
    /**
     * @property {String} urlRoot - The root url to be used in the error message.
     */
    urlRoot: "http://github.com/thejameskyle/metal.js",

    /**
     * @public
     * @constructs Error
     * @param {String} [message] - A description of the error.
     * @param {Object} [options] - Settings for the error.
     * @param {String} [options.message] - A description of the error.
     * @param {String} [options.url] - The url to visit for more help.
     */
    constructor: function (message, options) {
      if (options === undefined) options = {};
      // If options are provided in place of a message, assume message exists on
      // options.
      if (_.isObject(message)) {
        options = message;
        message = options.message;
      }

      // Create a fake error with message in order to capture a stack trace.
      var error = Error.call(this, message);

      // Copy over all the error-related properties.
      _.assign(this, _.pick(error, errorProps), _.pick(options, errorProps));

      // Adds a `stack` property to the given error object that will yield the
      // stack trace at the time captureStackTrace was called.
      // When collecting the stack trace all frames above the topmost call
      // to this function, including that call, will be left out of the
      // stack trace.
      // This is useful because we can hide Metal implementation details
      // that are not very helpful for the user.
      this.captureStackTrace();

      // Add url property to error, if provided.
      if (options.url) {
        this.url = this.urlRoot + options.url;
      }
    },

    /**
     * A safe reference to V8's `Error.captureStackTrace`.
     *
     * @public
     * @method captureStackTrace
     */
    captureStackTrace: function () {
      // Error.captureStackTrace does not exist in all browsers.
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, Err);
      }
    },

    /**
     * Formats the error message to display in the console.
     *
     * @public
     * @method toString
     * @returns {String} - Formatted error message.
     */
    toString: function () {
      return "" + this.name + ": " + this.message + (this.url ? " See: " + this.url : "");
    }
  });

  /**
   * @class Error
   * @mixes Class
   */
  _.assign(Err, Class);

  /**
   * Display a deprecation warning with the provided message.
   *
   * @public
   * @method deprecate
   * @param {String|Object} message - A description of the deprecation.
   * @param {String} message.prev - The deprecated item.
   * @param {String} message.next - The replacement for the deprecated item.
   * @param {String} [message.url] - The url to visit for more help.
   * @param {Boolean} [test] - An optional boolean. If falsy, the deprecation will be displayed.
   */
  var deprecate = Metal.deprecate = function (message, test) {
    // Returns if test is provided and is falsy.
    if (test !== undefined && test) {
      return;
    }

    // If message is provided as an object, format the object into a string.
    if (_.isObject(message)) {
      message = deprecate._format(message.prev, message.next, message.url);
    }

    // Ensure that message is a string
    message = message && message.toString();

    // If deprecation message has not already been warned, send the warning.
    if (!deprecate._cache[message]) {
      deprecate._warn("Deprecation warning: " + message);
      deprecate._cache[message] = true;
    }
  };

  /**
   * Format a message for deprecate.
   *
   * @private
   * @method _format
   * @memberOf deprecate
   * @param {String} prev - The deprecated item.
   * @param {String} next - The replacement for the deprecated item.
   * @param {String} [url] - The url to visit for more help.
   * @return {Sring} - The formatted message.
   */
  deprecate._format = function (prev, next, url) {
    return ("" + prev + " is going to be removed in the future. " + ("Please use " + next + " instead.") + (url ? " See: " + url : ""));
  };

  /**
   * A safe reference to `console.warn` that will fallback to `console.log` or
   * `_noop` if the `console` object does not exist.
   *
   * @private
   * @method _warn
   * @memberOf deprecate
   * @param {*...} - The values to warn in the console.
   */
  if (typeof console !== "undefined") {
    deprecate._warn = console.warn || console.log;
  }

  // If `console.warn` and `console.log` weren't found, just noop.
  if (!deprecate._warn) {
    deprecate._warn = _.noop;
  }

  /**
   * An internal cache to avoid sending the same deprecation warning multiple
   * times.
   *
   * @private
   * @property _cache
   * @memberOf deprecate
   */
  deprecate._cache = {};

  _.mixin({
    /**
     * Checks if `value` is a Metal Class.
     *
     * ```js
     * _.isClass(Class.extend(...));
     * // >> true
     * _.isClass(new Class());
     * // >> true
     * _.isClass(function() {...});
     * // >> false
     * _.isClass({...});
     * // >> false
     * ```
     * @public
     * @method isClass
     * @memberOf _
     * @param {*} value - The value to check.
     */
    isClass: function (value) {
      return !!value && (value instanceof Class || value.prototype instanceof Class);
    },

    /**
     * Checks if `value` is a Metal Mixin.
     *
     * ```js
     * _.isMixin(new Mixin());
     * // >> true
     * _.isMixin({});
     * // >> false
     * _.isMixin(function() {...});
     * // >> false
     * _.isMixin(new Class());
     * // >> false
     * ```
     *
     * @public
     * @method isMixin
     * @memberOf _
     * @param {*} value - The value to check.
     */
    isMixin: function (value) {
      return !!value && value instanceof Mixin;
    }
  });

  return Metal;
});
//# sourceMappingURL=metal.js.map