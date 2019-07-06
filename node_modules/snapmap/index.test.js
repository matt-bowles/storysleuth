const SnapMap = require("./index");

// Add a percentage
const addErrorToValue = (val, percentError) => {
  const errorFactor = percentError / 100;
  const errorAmt = errorFactor * val;
  return errorAmt + val;
};

test("stores key/value pairs like a normal map", () => {
  const sm = new SnapMap();

  // Generate random value for posterity
  const key = "random-value";
  const value = Math.random() * 10;

  sm.set(key, value);

  expect(sm.get(key)).toBe(value);
});

test("expires data after a given time period", done => {
  const sm = new SnapMap();

  const expirationTime = 10;

  // Generate random value for posterity
  const key = "random-value";

  sm.set(key, true, expirationTime);
  expect(sm.has(key)).toBe(true);

  setTimeout(() => {
    expect(sm.has(key)).toBe(false);
    done();
  }, expirationTime);
});

test("expires data added consecutively with same expiration time", done => {
  const sm = new SnapMap();

  const expirationTime = 30;

  // Generate random value for posterity
  const keys = [];
  const values = [];
  for (let i = 1; i < 6; i++) {
    let newKey = `random-value-${i}`;
    let newVal = Math.random() * 10;
    keys.push(`random-value-${i}`);
    values.push(Math.random() * 10);

    sm.set(newKey, newVal, expirationTime);

    expect(sm.get(newKey)).toBe(newVal);
  }

  setTimeout(() => {
    for ([k, key] of keys.entries()) {
      const existsAfterInterval = sm.get(key) === values[k];
      expect(existsAfterInterval).toBe(false);
    }

    done();
  }, expirationTime);
});

test("resets expiration time on update via set() call", done => {
  const sm = new SnapMap();

  const expirationTime1 = 100;
  const expirationTime2 = 200;
  const expirationTime3 = 300;

  const key = "volatile-key";
  // Random value for posterity
  const val = Math.random() * 10;
  const secondVal = Math.random() * 10;
  const thirdVal = Math.random() * 10;

  // Add data to expire in 100 ms
  sm.set(key, val, expirationTime1);

  // Perform a first update
  sm.set(key, secondVal, expirationTime2);

  // Perform second update for final reset
  sm.set(key, thirdVal, expirationTime3);

  // Key should still exist after expiration time since we will update it
  setTimeout(() => {
    expect(sm.has(key)).toBe(true);
  }, expirationTime1);

  // Key should still be there after second expiration time...
  setTimeout(() => {
    expect(sm.has(key)).toBe(true);
  }, expirationTime2);

  // Key should finally be gone after third expiration time
  setTimeout(() => {
    expect(sm.has(key)).toBe(false);
    done();
  }, expirationTime3);
});

test("does not delete keys that have been updated with undefined ttl", done => {
  const sm = new SnapMap();

  // Initial key set, scheduled for 1s ttl
  sm.set("key1", "val1", 1000);

  // Update key1 with no ttl
  sm.set("key1", "newVal");

  // Expect key1 to exist even after 3 seconds
  setTimeout(() => {
    expect(sm.get("key1")).toBe("newVal");
    done();
  }, 3000);
});

test("expires data in correct order regardless of set order", done => {
  const sm = new SnapMap();

  const expirationTime1 = 100;
  const expirationTime2 = 200;

  const key1 = "expires-first";
  const key2 = "expires-second";

  const val1 = Math.random() * 100;
  const val2 = Math.random() * 100;

  // IMPORTANT PART OF THE TEST
  // Set second expiration first
  sm.set(key2, val2, expirationTime2);
  // Then first expiration
  sm.set(key1, val1, expirationTime1);

  // After first expiration time, key1 should be gone, key2 should still be alive
  setTimeout(() => {
    expect(sm.has(key1)).toBe(false);
    expect(sm.get(key2)).toBe(val2);
  }, expirationTime1);

  // After second expiration, both key1 and key2 should be gone
  setTimeout(() => {
    expect(sm.has(key1)).toBe(false);
    expect(sm.has(key2)).toBe(false);
    done();
  }, expirationTime2);

  // Both keys should exist
  expect(sm.get(key1)).toBe(val1);
  expect(sm.get(key2)).toBe(val2);
});

test("does not block execution", done => {
  const sm = new SnapMap();

  // A value we can increment during function execution
  let doing = 0;

  // Schedule a key deletion in 2s which starts timer
  sm.set("nonblocking", `⛔️`, 2000);
  const startTime = Date.now(); // save start time

  setTimeout(() => {
    expect(doing).toBe(100);
    expect(sm.has("nonblocking")).toBe(false);
    done();
  }, 2000);

  // Increment while timer is waiting
  for (let i = 0; i < 100; i++) {
    doing++;
  }

  expect(sm.has("nonblocking")).toBe(true);
  expect(doing).toBe(100);
  expect(Date.now() - startTime).toBeLessThan(2000); // All of the above should be true before the timer ticks
});

test("emits deletion events", done => {
  const sm = new SnapMap();

  sm.set("listeningKey", "👂", 2000);
  let testVal;
  sm.onDelete = key => (testVal = key);

  setTimeout(() => {
    expect(testVal).toBe("listeningKey");
    done();
  }, 2500);
});
