// iisnode cannot directly load ghost's entry script in a nested folder
// See: https://github.com/tjanczuk/iisnode/issues/338

// nconv allows expressing env variables to override config values
// ghost sets the separator as '__',
// see https://github.com/TryGhost/Ghost/blob/master/core/server/config/index.js
process.env['server__port'] = process.env.PORT;

require(__dirname + '/app/index.js');
