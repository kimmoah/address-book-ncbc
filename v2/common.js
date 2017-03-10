var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

var REPORT_LOG_COLUMN = 'F';

function thisWeekSunday() {
  var today = new Date();
  var diff = today.getDate() - today.getDay();
  return new Date(today.setDate(diff));
}

function dateToReportTitle(date) {
  return date.getFullYear() + '/' + (date.getMonth()+1) + '/' + date.getDate();
}

function reportTitle() {
  return dateToReportTitle(thisWeekSunday());
}
