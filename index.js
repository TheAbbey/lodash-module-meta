var lodash = require('lodash');
var vm = require('vm');
var Promise = require('bluebird');
var request = require('request-promise');
var util = require('lodash-cli/lib/util');
var fs = require('fs');

function makeSandbox() {
  return vm.createContext({
    require: function(file) {
      if (/lodash/.test(file)) return lodash;
      else if (/util/.test(file)) return util;
    },
    module: {
      exports: {}
    }
  });
}

request({
  url: 'https://api.github.com/repos/lodash/lodash-cli/tags',
  headers: {
    'User-Agent': 'lodash-fetcher'
  }
}).then(function(tags) {
  tags = JSON.parse(tags);

  Promise.map(tags, function(tag) {
    var url = 'https://raw.githubusercontent.com/lodash/lodash-cli/' + tag.name + '/lib/mapping.js';
    return request.get(url)
    .then(function(file) {
      var sandbox = makeSandbox();
      vm.runInContext(String(file), sandbox);
      sandbox.module.exports.tag = tag.name;
      return sandbox.module.exports;
    }, function() {
      return null;
    })
  })
  .then(function(modules) {
    modules = lodash.filter(modules);

    var result = lodash.transform(modules, function(memo, module) {
      memo[module.tag] = lodash.pick(module, 'aliasToReal', 'category');
    });
    fs.writeFileSync('database.json', JSON.stringify(lodash.toPlainObject(result), null, "\t"));
  });;
});
