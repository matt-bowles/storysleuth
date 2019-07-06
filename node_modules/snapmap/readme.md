# Snapmap 📬⏳📭

[![npm version](https://badge.fury.io/js/snapmap.svg)](https://badge.fury.io/js/snapmap)

A tiny (~1kb minified & gzip'd) extension of the ES6 [Map object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map) that lets you set an expiration time for key/value pairs. Expired data is automatically pruned to avoid wasting memory.

## Getting Started

```javascript
const SnapMap = require('snapmap');

const myMap = new SnapMap();
const uniqueObj = { uniqueData: [1, 2, 3] };

myMap.set(
  uniqueObj,
  `🦄`,
  10 * 1000) // time (in ms) until data is deleted
);

console.log(myMap.get(uniqueObj)) // `🦄`

// More than 10 seconds later...
console.log(myMap.get(uniqueObj)) // undefined
```

## Installation

    npm install --save snapmap

## Usage

The Snapmap API is exactly the same as the [ES6 Map API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#Map_instances) with one exception: **the `set()` method accepts one extra, optional parameter.**

```javascript
class SnapMap extends Map {
  ...
  set(key: any, value: any, ttl: number?) {
    // Performs native Map operations and schedules
    // deletion if ttl is defined
  }
}
```

The optional `ttl` argument, when defined, specifies the number of milliseconds that will pass before the key/value pair is automatically deleted.

## Browser & Node.js Support

Supported everywhere that [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map), [async](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)/[await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await), and [ES6 classes](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes) are supported.

That means...

* All modern browsers supported
* Node 8+ supported

## Special Scenarios

### Key Updates

If you update a key with a new ttl, the key/value pair won't be deleted until the new ttl elapses:

```javascript
const SnapMap = require("snapmap");

const dynamicMap = new SnapMap();

// Let's say it's 01:00:00 PM here
dynamicMap.set("key1", "val", 60 * 1000);

// 30 seconds later... (01:00:30 PM)
dynamicMap.set("key1", "newVal", 60 * 1000);

// 30 more seconds go by... (01:01:00 PM)
dynamicMap.get("key1"); // 'newVal' - still exists 60s after original set

// And 30 more seconds... (01:01:30 PM)
dynamicMap.get("key1"); // undefined - data deleted after second ttl
```

This means that you can effectively **abort scheduled deletes** by updating a key and passing no ttl value:

```javascript
dynamicMap.set("persistKey", "value", 10 * 1000);

// Less than 10s later
dynamicMap.set("persistKey", "newVal");

// Some time in the distant future...
dynamicMap.get("persistKey"); // 'newVal' - data is never deleted
```

### Monitoring Delete Events

You can easily subscribe to the `onDelete` event to be notified when a scheduled delete occurs. The `onDelete` function is passed a single parameter, the deleted key:

```javascript
const SnapMap = require("snapmap");

const monitorMap = new SnapMap();

monitorMap.set("monitoredKey", "val", 60 * 1000);

monitorMap.onDelete = key => console.log(key);

// 60 seconds later:
// "monitoredKey"
```

### Caveats

**1.2.0 Update:** Version 1.2.0 adds ttl "clamping" behavior which mitigates `setTimeout` delays. Now, Snapmap will always correctly report that expired keys do not exist, and `get` operations will return `undefined`. See the [change commit](https://github.com/cgatno/snapmap/commit/a7ff594a82b8db6f24e834f4ed8866f94ffaffac) for more information.

This package uses the `setTimeout()` function to schedule deletions by 'sleeping' execution of an async function. (Take a look at the source to see exactly how this is done.) If you're familiar with the typical JS engine event loop, that probably scares you quite a bit. And rightfully so! Because of the reliance on `setTimeout`, **scheduled deletion times are not exact.** They will never occur earlier than requested, but they may be delayed.

For more information on what causes `setTimeout` delays and browser throttling of `setTimeout`, check out [MDN's explanation](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout#Reasons_for_delays_longer_than_specified).

## Roadmap 🛣🗺

* Allow key updates that preserve original ttl
* Update tests to use higher resolution test methods (false negatives from inaccurate `setTimeout`)
* ~~Investigate alternate scheduling methods (higher resolution than `setTimeout`)~~

## Contributing

All are welcomed _and encouraged_ to contribute to this project!

    git clone https://github.com/cgatno/snapmap.git
    cd snapmap
    npm install

Even though this isn't exactly a "mission critical" or groundbreaking Node
module, I think it's a great little project to hack on if you're just getting
started with Node or looking for something fun to work on.

If you're feeling up to the challenge, please read on before jumping in! It's
really not that bad, and I promise you'll have lots of fun along the way.

### Unit Testing

I've implemented a basic [Jest](https://facebook.github.io/jest/) setup for
quick and easy unit testing.

If you're not familiar with Jest, take a look at the
[docs](https://facebook.github.io/jest/docs/en/getting-started.html) or some of
the existing tests to get started. The syntax is extremely semantic and
easy-to-read, so you'll be able to figure it out in no time.

You can run all unit tests at once using `npm run test`. Don't forget to rebuild
your code before testing!

### Versioning

I use [SemVer](http://semver.org/) for versioning. For the versions available,
see the [tags on this repository](https://github.com/cgatno/snapmap/tags).

### Communication

Even if you don't want to work on the project yourself, you can help out a lot
just by reporting any bugs you find or enhancements you want to see added!

Head over to [GitHub's issue tracker](https://github.com/cgatno/snapmap/issues) to
submit a bug report or feature request!

### Don't Be Afraid To Ask for Help!

Last but _certainly_ not least, **don't be afraid to reach out for help!** If
you have any questions, don't hesitate to
[shoot me an email](mailto:hello@christiangaetano.com)! 📫🙌

## Authors

* [Christian Gaetano](https://christiangaetano.com)

See also the list of
[contributors](https://github.com/cgatno/measuring-cup/contributors) who
participated in this project.

## License

This project is licensed under the MIT License. See the [LICENSE](license) file
for details.
