var test = require('tape')

test('check for build output', function(t) {
  try {
    require('../native')() != null ? t.pass('Found audio_mpg123.') : null
  } catch (err) {
    t.error(err, 'Could not find audio_mpg123.')
  }
  t.end()
})
