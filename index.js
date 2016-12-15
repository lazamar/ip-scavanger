/* eslint-disable new-cap */
const { Future } = require('ramda-fantasy');
const { curry, compose, concat } = require('ramda');
const request = require('request');

// String -> Future
const httpGet = curry((url) =>
  Future((rej, res) =>
    request(
      url,
      (error, response) => (error ? rej(error) : res(response))
    )
  )
);

// String -> Future
const searchIp = compose(httpGet, concat('http://www.hashemian.com/tools/reverse-whois.php?b='));

const searchMyIp = searchIp('195.171.93.18');


searchMyIp.fork(e => console.log('Oops error ahead:', e), console.log);
