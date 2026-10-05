// 6 digit numeric passcode generator (used for visitors + daily help)
function generatePasscode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

module.exports = { generatePasscode };
