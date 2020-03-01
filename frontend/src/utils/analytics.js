/* eslint-disable import/no-mutable-exports, no-console, no-unused-vars */
/* eslint-disable no-param-reassign, no-multi-assign */

/*
  This file is mostly just a replacement for segment's analytics.js snippet
  We copied their snippet which does the following:
  - make sure the snippet wasnt already loaded
  - stub their methods & add calls to queue which gets handled after load
  - load the script (async)
  - copied their argument re-shuffling code

  But also made some changes and added some functionality:
  - create an exportable module instead of relying on window.analytics
    inspired by https://github.com/vvo/analytics.js-loader
  - always load HTTPS version
  - add a callback for when it gets loaded
  - add a global kill switch to disable segment which:
    - uses config from process.env (production OR test mode)
    - also turns off user agent is phantom, which is used to pre-render
      otherwise we had scripts/pixels included from pre-render loading again
  - create wrappers around identify, track, page which:
    - respect kill switch and only log if tracking is disabled
    - if we have an unauth'd user but we do have an email, we split each call
      and send vero the info with email as the primary id so we can email
      abandoned signups
      see https://segment.com/docs/destinations/vero/
*/
import storage from 'local-storage-fallback'; // polyfill storage - falls back to cookies, memory, etc

const isNotAdmin = !storage.getItem('leq-impersonate-auth-token');
let ENABLE_TRACKING = process.env.EATWAVE_ENV === 'production' && isNotAdmin;
if (process.env.TEST_SEGMENT) ENABLE_TRACKING = true;
// detect the pre-render so we dont include a bunch of 3rd party scripts
if (navigator.userAgent.indexOf('Headless') > 0) ENABLE_TRACKING = false;
if (!ENABLE_TRACKING) console.log('TRACKING DISABLED - calls logged only');

// THIS IS COPIED FROM SEGMENT'S ANALYTICS.js SNIPPET //////////////////////////
// https://segment.com/docs/sources/website/analytics.js/quickstart/

// Create a queue, but don't obliterate an existing one!
let analytics = window.analytics = window.analytics || [];
// If the snippet was invoked already show an error.
if (analytics.invoked) throw new Error('segment loaded twice');
analytics.invoked = true; // flag to make sure snippet never invoked twice
analytics.SNIPPET_VERSION = '4.0.0';
// A list of the methods in Analytics.js to stub.
analytics.methods = 'trackSubmit trackClick trackLink trackForm pageview identify reset group track ready alias debug page once off on'.split(' ');

// Define a factory to create stubs. These are placeholders
// for methods in Analytics.js so that you never have to wait
// for it to load to actually record data. The `method` is
// stored as the first argument, so we can replay the data.
analytics.factory = function (method) {
  return function (...args) {
    args.unshift(method);
    analytics.push(args);
    return analytics;
  };
};

// For each of our methods, generate a queueing stub.
for (let i = 0; i < analytics.methods.length; i++) {
  const key = analytics.methods[i];
  analytics[key] = analytics.factory(key);
}
// END SEGMENT SNIPPET /////////////////////////////////////////////////////////

// we wrapped the script loading part in a promise and only use HTTPS
const analyticsLoaded = new Promise((resolve, reject) => {
  if (!ENABLE_TRACKING) {
    resolve();
    return;
  }

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = `https://cdn.segment.com/analytics.js/v1/${
    process.env.SEGMENT_WRITE_KEY
  }/analytics.min.js`;
  script.onload = () => {
    ({ analytics } = window);
    resolve();
  };

  // attach the script
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(script, firstScriptTag);
});


// copied from https://github.com/enricomarino/is
const is = {
  fn(value) {
    const isAlert = typeof window !== 'undefined' && value === window.alert;
    if (isAlert) return true;
    const str = Object.prototype.toString.call(value);
    return str === '[object Function]' || str === '[object GeneratorFunction]' || str === '[object AsyncFunction]';
  },
  object(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  },
  string(value) {
    return Object.prototype.toString.call(value) === '[object String]';
  },
};

function callIfFunction(fn) { if (typeof fn === 'function') fn(); }

// writing a wrapper around analytics.js so we can intercept and mess with
// options and destinations.
// I copied the "Argument Shuffling" sections from their code
const wrappedAnalytics = {
  async identify(id, traits, options, fn) {
    await analyticsLoaded;
    // Argument reshuffling.
    /* eslint-disable no-unused-expressions, no-sequences */
    if (is.fn(options)) fn = options, options = null;
    if (is.fn(traits)) fn = traits, options = null, traits = null;
    if (is.object(id)) options = traits, traits = id, id = null;
    /* eslint-enable no-unused-expressions, no-sequences */

    options = options || {};
    // dont want to default traits to {} as it can reset segment

    if (ENABLE_TRACKING) {
      analytics.identify(id, traits, options, fn);
    } else {
      console.log(`[SEGMENT] identify | ID=${id || 'ANONYMOUS'}`, traits, options);
      callIfFunction(fn);
    }
  },
  async track(event, properties, options, fn) {
    await analyticsLoaded;
    // Argument reshuffling.
    /* eslint-disable no-unused-expressions, no-sequences */
    if (is.fn(options)) fn = options, options = null;
    if (is.fn(properties)) fn = properties, options = null, properties = null;
    /* eslint-enable no-unused-expressions, no-sequences */

    options = options || {};

    // check to make sure we track only with fe_ names
    if (event.slice(0, 3) !== 'fe_') throw new Error('tracked event names must start with "fe_"');

    properties = properties || {};

    if (ENABLE_TRACKING) {
      // we will send FB Standard events seperately
      if (properties.fb) {
        const fbProps = properties.fb === true ? {} : properties.fb;
        delete properties.fb;

        // default fb standard event type = ViewContent
        const fbStandardEventType = fbProps.event || 'ViewContent';
        // default content_name = original event name (for ViewContent only)
        let fbContentName = fbProps.content_name;
        if (fbStandardEventType === 'ViewContent') fbContentName = fbContentName || event;
        analytics.track(fbStandardEventType, {
          ...fbContentName && { content_name: fbContentName },
          ...properties,
        }, {
          ...options,
          integrations: { All: false, 'Facebook Pixel': true },
        });
        // you can toggle on the event to only track to facebook
        if (fbProps.only) return;
      }

      // do not track custom events to facebook
      options.integrations = { ...options.integrations, 'Facebook Pixel': false };

      analytics.track(event, properties, options, fn);
    } else {
      console.log(`[SEGMENT] track | EVENT=${event}`, properties, options);
      callIfFunction(fn);
    }
  },
  async page(category, name, properties, options, fn) {
    await analyticsLoaded;
    // Argument reshuffling.
    /* eslint-disable no-unused-expressions, no-sequences */
    if (is.fn(options)) fn = options, options = null;
    if (is.fn(properties)) fn = properties, options = properties = null;
    if (is.fn(name)) fn = name, options = properties = name = null;
    if (is.object(category)) options = name, properties = category, name = category = null;
    if (is.object(name)) options = properties, properties = name, name = null;
    if (is.string(category) && !is.string(name)) name = category, category = null;
    /* eslint-enable no-unused-expressions, no-sequences */

    options = options || {};

    if (ENABLE_TRACKING) {
      analytics.page(category, name, properties, options, fn);
    } else {
      console.log(`[SEGMENT] page | NAME=${category ? `${category}/` : ''}${name}`, properties, options);
      callIfFunction(fn);
    }
  },
  async reset() {
    await analyticsLoaded;
    if (ENABLE_TRACKING) {
      analytics.reset();
    } else {
      console.log('[SEGMENT] reset');
    }
  },
};

export default wrappedAnalytics;
