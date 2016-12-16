/* eslint-disable new-cap */
const { Future, Maybe } = require('ramda-fantasy');
const { curry, compose, concat, join, map } = require('ramda');
const request = require('request');

// String -> Future String
const httpGet = curry((url) =>
  Future((rej, res) =>
    request(
      url,
      (error, response) => (
        response && response.toJSON
          ? res(response.toJSON().body)
          : rej(error)
    ))
  )
);

// String -> Future String
const searchIp = compose(httpGet, concat('http://www.hashemian.com/tools/reverse-whois.php?b='));

// Regex -> Int -> String -> Maybe Object {matches: [String], lastIndex: Int}
const execRegex = curry((regex, startIndex, text) => {
  const re = new RegExp(regex);
  re.lastIndex = startIndex;
  return Maybe(re.exec(text))
    .map(v => ({
      matches: v,
      lastIndex: re.lastIndex,
    }));
});

// maps only an index
const mapIndex = curry((idx, f, arr) =>
  arr.map((v, vIdx) =>
    (idx === vIdx ? f(v) : v)
  ));

// Regex -> String -> [String]
const findAll = curry((regex, text) =>
  Maybe(text)
  .chain(execRegex(regex, 0))
  .map(m => [m.matches[1], m.lastIndex])
  .map(mapIndex(1, n => text.slice(n)))
  .map(mapIndex(1, findAll(regex)))
  .map(([found, otherFound]) => [found].concat(otherFound))
  .getOrElse([])
);

// String -> Maybe String
const getField = curry((fieldRegex, text) =>
  Maybe(text)
    .map(findAll(fieldRegex))
    .map(join(', '))
);

// String -> Maybe String
const getAddress = getField(/\naddress:\s*([^\n]+)/gi);
// String -> Mabe String
const getPerson = getField(/\nperson:\s*([^\n]+)/gi);
// String -> Mabe String
const getPhone = getField(/\nphone:\s*([^\n]+)/gi);
// String -> Mabe String
const getNetName = getField(/\netname:\s*([^\n]+)/gi);
// Regex -> String -> Maybe String
const getInfo = curry((fieldRetrievers, text) =>
  Maybe(text)
  .map(t => fieldRetrievers
      .map(f => f(t)) // now we have an array of Maybe String
      .reduce((acc, m) =>
        m
        .map(concat(`${acc}\n`))
        .getOrElse(acc), '') // now reduced to a string
  )
);

// String -> Maybe String
const companyInfo = getInfo([
  getAddress,
  getPerson,
  getPhone,
  getNetName,
]);

// String -> Maybe String
const fetchCompanyInfoByIP = compose(map(companyInfo), searchIp);

console.log(process.argv[1]);
fetchCompanyInfoByIP(process.argv[1])
  .fork(
    e => console.log('Oops error ahead:', e),
    r =>
      console.log(r.getOrElse('Nothing found'))
  );
