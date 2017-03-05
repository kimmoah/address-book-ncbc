var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

var REPORT_LOG_COLUMN = 'F';

function reportTitle() {
  var today = new Date();
  var diff = today.getDate() - today.getDay();
  var sunday = new Date(today.setDate(diff));
  return sunday.getFullYear() + '/' + (sunday.getMonth()+1) + '/' + sunday.getDate();
}
