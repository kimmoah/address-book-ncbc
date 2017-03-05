GroupsServiceModule = angular.module('GroupsServiceModule', [AuthServiceModule.name]);

// The Google Spreadsheet ID that contains the address book of NCBC Young Adults.
var ADDRESSBOOK_ID = '1E11ya9JAGIrHKLdgZccxPpzWSbQzw6MFLXq7f6tOy-U';

GroupData = function(row, group) {
  // The number of ROW in the spreadsheet. 1 based.
  this.rowNumber = row;
  this.name = group[0];
  this.leader = group[2];
  this.reportSheetId = null;
  this.tier = null;

  // The Google Spreadsheets with the address book. This contains information of
  // sheets in the spreadsheets.
  this.sheets = null;

  if (group.length > 3) {
    this.tier = group[3];
  }
  if (group.length > 4) {
    // Extract spreadsheet id from the link.
    var spreadsheetAddress = group[4];
    var ID_PATH = 'spreadsheets/d/';
    var index = spreadsheetAddress.indexOf(ID_PATH);
    if (index != -1) {
      var idEnd = spreadsheetAddress.indexOf('/', index + ID_PATH.length);
      this.reportSheetId = spreadsheetAddress.substring(index + ID_PATH.length, idEnd);
    }
  }
};
GroupData.prototype.getReportLink = function() {
  return '/#/report?name=' + this.name + '&report_sheetid=' + this.reportSheetId +
    '&report_log_row=' + this.rowNumber;
};

var GroupsServiceBody = function($q, AuthService) {
  this.allGroupSheet = null;
  this.AuthService = AuthService;

  // Be notified by the login status change.
  gapi.auth2.getAuthInstance().isSignedIn.listen(
      angular.bind(this, this.updateSigninStatus));

  // Be notified by the login status change.
  gapi.auth2.getAuthInstance().isSignedIn.listen(
      angular.bind(this, this.updateSigninStatus));

  // If already signed in, load the address book.
  if (AuthService.isSignedIn) {
    this.updateSigninStatus(true);
  }
  console.log('GroupsServiceBody');
  this.listeners = [];
};

GroupsServiceBody.prototype.listen = function(target) {
  this.listeners.push(target);
};

GroupsServiceBody.prototype.updateSigninStatus = function(isSignedIn) {
  if (this.AuthService.isSignedIn) {
    // Does not need to load the sheet multiple times.
    if (!this.allGroupSheets) {
      gapi.client.sheets.spreadsheets.get({
      spreadsheetId: ADDRESSBOOK_ID
    }).then(angular.bind(this, this.handleLoadingSheets));
    }
  } else {
    this.sheets = null;
    this.allGroupSheet = null;
    this.notifyListeners();
  }
};

GroupsServiceBody.prototype.handleLoadingSheets = function(response) {
  this.sheets = response.result;
  var allGroupSheet = null;
  for (var i = 0; i < this.sheets.sheets.length; ++i) {
    var sheet = this.sheets.sheets[i];
    var sheetProperties = sheet.properties;
    if (sheetProperties.title.indexOf('전체 목장') != -1) {
      allGroupSheet = sheet;
      break;
    }
  }
  if (allGroupSheet) {
    var gridProperties = allGroupSheet.properties.gridProperties;
    var startRow = gridProperties.frozenRowCount + 1;
    var endColumn = gridProperties.columnCount;
    var range = allGroupSheet.properties.title + '!A' + startRow  + ':' + ALPHABET.charAt(endColumn - 1) + gridProperties.rowCount;
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: ADDRESSBOOK_ID,
      range: range
    }).then(angular.bind(this, this.handleLoadingAllGroups));
  } else {
    this.$mdDialog.show(
      this.$mdDialog.alert()
      .parent(angular.element(document.querySelector('#popupContainer')))
      .clickOutsideToClose(true)
      .title('Cannot find a sheet of listing all groups.')
      .textContent('Cannot find It!!!')
      .ariaLabel('Alert Dialog Demo')
      .ok('Got it!')
      );
    this.notifyListeners();
  }
};


// Handler when a sheet containing all groups is loaded.
GroupsServiceBody.prototype.handleLoadingAllGroups = function(response) {
  this.allGroupSheet = [];
  for (var i = 0; i < response.result.values.length; ++i) {
    this.allGroupSheet.push(new GroupData(i + 2, response.result.values[i]));
  }
  this.notifyListeners();
};

GroupsServiceBody.prototype.notifyListeners = function() {
  for (var i = 0; i < this.listeners.length; ++i) {
    this.listeners[i](this.allGroupSheet);
  }
};

GroupsService = GroupsServiceModule.service('GroupsService', GroupsServiceBody);
