// Define the main module.
SaenuriYoungModule = angular.module('SaenuriYoungModule',['ngMaterial', 'ngRoute', 'ngMessages', 'md.data.table', AuthServiceModule.name]);

// The Google Spreadsheet ID that contains the address book of NCBC Young Adults.
var ADDRESSBOOK_ID = '1E11ya9JAGIrHKLdgZccxPpzWSbQzw6MFLXq7f6tOy-U';

// Contraoller for the top page.
TopPageController = function($scope, $mdDialog, AuthService) {
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;

  // TopPageController is created before the service is resolved by router,
  // need to be notified by it.
  AuthService.promise.then(angular.bind(this, this.AuthServiceInitDone));
  this.AuthService = AuthService;
  this.isAuthServiceInitialized_ = false;
};

TopPageController.prototype.AuthServiceInitDone = function() {
  this.isAuthServiceInitialized_ = true;
};

TopPageController.prototype.isSignedIn = function() {
  return this.isAuthServiceInitialized_ && this.AuthService.isSignedIn;
};

TopPageController.prototype.alertAuthIsNotReady_ = function() {
  this.$mdDialog.show(
      this.$mdDialog.alert()
      .clickOutsideToClose(true)
      .title('Initialization Error')
      .textContent('Google Authentication Service is not yet initialized.')
      .ariaLabel('Authentication Service')
      .ok('Got it!')
      );
};

TopPageController.prototype.handleAuthClick = function() {
  if (!this.isAuthServiceInitialized_) {
    this.alertAuthIsNotReady_();
    return;
  }
  gapi.auth2.getAuthInstance().signIn();
};
TopPageController.prototype.handleSignoutClick = function() {
  if (!this.isAuthServiceInitialized_) {
    this.alertAuthIsNotReady_();
    return;
  }
  gapi.auth2.getAuthInstance().signOut();
};

// Controller to list every groups.
AddressBookController = function($scope, $mdDialog, AuthService) {
  // Store the injected services.
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  this.AuthService = AuthService;

  // The Google Spreadsheets with the address book. This contains information of
  // sheets in the spreadsheets.
  this.sheets = null;

  // Sheet containing information of every group.
  this.allGroupSheet = null;

  // Be notified by the login status change.
  gapi.auth2.getAuthInstance().isSignedIn.listen(
      angular.bind(this, this.updateSigninStatus));

  // If already signed in, load the address book.
  if (AuthService.isSignedIn) {
    this.updateSigninStatus(true);
  }
};

AddressBookController.prototype.updateSigninStatus = function(isSignedIn) {
  if (this.AuthService.isSignedIn) {
    // Does not need to load the sheet multiple times.
    if (!this.allGroupSheets) {
      gapi.client.sheets.spreadsheets.get({
      spreadsheetId: '1E11ya9JAGIrHKLdgZccxPpzWSbQzw6MFLXq7f6tOy-U'
    }).then(angular.bind(this, this.handleLoadingSheets));
    }
  } else {
    this.sheets = null;
    this.allGroupSheet = null;
    this.$scope.$apply();
  }
};

AddressBookController.prototype.handleLoadingSheets = function(response) {
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
    // TODO(youngjin): Use this instead of hard-coded 'C'.
    var endColumn = gridProperties.columnCount;
    var range = allGroupSheet.properties.title + '!A' + startRow  + ':D' + gridProperties.rowCount;
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
  }
  this.$scope.$apply();
};

// Handler when a sheet containing all groups is loaded.
AddressBookController.prototype.handleLoadingAllGroups = function(response) {
  this.allGroupSheet = response.result;
  this.$scope.$apply();
};

// Returns a link of report for each group.
AddressBookController.prototype.getReportLink = function(group) {
  // Extract spreadsheet id from the link.
  var spreadsheetAddress = group[3];
  var ID_PATH = 'spreadsheets/d/';
  var index = spreadsheetAddress.indexOf(ID_PATH)
  if (index == -1) {
    return '';
  }
  var idEnd = spreadsheetAddress.indexOf('/', index + ID_PATH.length);
  var spreadSheetId = spreadsheetAddress.substring(index + ID_PATH.length, idEnd);
  var link = '/#/report?name=' + group[0] + '&report_sheetid=' + spreadSheetId;
  return link;
};

MemberData = function(name) {
  this.name = name;
  this.status = 0;
  this.note = '';
};
MemberData.status = [
  '잘 모름',
  '예배 및 목장 참석',
  '예배만 참석',
  '목장만 참석'
];

MemberData.prototype.getReportArray = function() {
  var ret = [];
  ret.push(this.name);
  ret.push(MemberData.status[this.status]);
  ret.push(this.note);

  return ret;
};

SubmitReportController = function($scope, $location, $mdDialog) {
  // Store the injected services.
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;

  // To use from the template.
  this.memberStatus = MemberData.status;
  var search = $location.search();

  // Extract name and sheet id from the query parameters.
  this.name = search['name'];
  this.reportSpreadSheetId = search['report_sheetid'];
  this.memberData = null;
  this.groupNote = '';
  if (this.name && this.reportSpreadSheetId) {
    var range = this.name + '!A2:A100';
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: ADDRESSBOOK_ID,
      range: range
    }).then(angular.bind(this, this.handleLoadingGroup));
  } else {
    this.$mdDialog.show(
        this.$mdDialog.alert()
        .clickOutsideToClose(true)
        .title('Missing Query Parameter')
        .textContent('Either "name" or "report_sheetid" is missing')
        .ariaLabel('Report Page')
        .ok('Oops!')
        );
  }
};

// Loading members in the group.
SubmitReportController.prototype.handleLoadingGroup = function(response) {
  this.memberData = [];
  for (var i = 0; i < response.result.values.length; ++i) {
    this.memberData.push(new MemberData(response.result.values[i][0]));
  }
  this.$scope.$apply();
};

// Title of the report, which will be the name of the sheet.
SubmitReportController.prototype.reportTitle = function() {
  var today = new Date();
  return today.getFullYear() + '/' + (today.getMonth()+1) + '/' + today.getDate();
};

// Submit the report.
SubmitReportController.prototype.submitReport = function(response) {
  // First, create the sheet.
  gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: this.reportSpreadSheetId,
    'requests': [{
      'addSheet': {
        'properties': {
          'title': this.reportTitle(),
          'gridProperties': {
            'rowCount': this.memberData.length,
            'columnCount': 3
          }      } }
    }]
  }).then(angular.bind(this, this.addReportSheet),
          angular.bind(this, this.createSheetFail));
};

// When failed, just assume that there is the same spreadsheet.
SubmitReportController.prototype.createSheetFail = function(response) {
  if (response.result.error.message.indexOf('already exists') != -1) {
    var confirm = this.$mdDialog.confirm()
      .title('중복된 리포트' )
      .textContent('오늘 이미 리포트를 제출 하셨습니다. 덮으시겠습니까?')
      .ariaLabel('Alert Dialog Demo')
      .ok('넵!')
      .cancel('취소하겠습니다');
    var self = this;
    this.$mdDialog.show(confirm).then(function() {
        self.addReportSheet(null);
        });
  } else {
    this.$mdDialog.show(
      this.$mdDialog.alert()
      .clickOutsideToClose(true)
      .title('Spreadsheet Creation Error')
      .textContent(response.result.error.message)
      .ariaLabel('Authentication Service')
      .ok('Oops!')
      );
  }
};

/**
 * <response> maybe null;
*/
SubmitReportController.prototype.addReportSheet = function(response) {
  var range = this.reportTitle() + '!A1:C' + (this.memberData.length + 1);

  var values = [];

  var groupNote = [];
  groupNote.push('목장 노트');
  groupNote.push(this.groupNote);

  values.push(groupNote);
  for (var i = 0; i < this.memberData.length; ++i) {
    values.push(this.memberData[i].getReportArray());
  }
  gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: this.reportSpreadSheetId,
    valueInputOption: 'RAW',
    data: [{
      'range': range,
      'values': values
    }] 
  }).then(angular.bind(this, this.addReportSheetReponse),
    angular.bind(this, this.addReportSheetFailure));
};

SubmitReportController.prototype.addReportSheetReponse = function(response) {
  var valueRow = [];
  valueRow.push(this.reportTitle());
  valueRow.push(this.name);

  gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId: ADDRESSBOOK_ID,
    valueInputOption: 'RAW',
    range: 'ReportLogs!A1:C1',
    values: [valueRow]
  }).then(angular.bind(this, this.addReportLogs));

  this.$mdDialog.show(
      this.$mdDialog.alert()
      .clickOutsideToClose(true)
      .title('성공')
      .textContent('목장 리포트를 성공적으로 제출하였습니다!')
      .ariaLabel('Result of submitting report')
      .ok('Got it!')
      );
};

SubmitReportController.prototype.addReportLogs = function(response) {
};

SubmitReportController.prototype.addReportSheetFailure = function(response) {
  this.$mdDialog.show(
      this.$mdDialog.alert()
      .clickOutsideToClose(true)
      .title('Oh Nooooooo!!')
      .textContent(response.result.error.message)
      .ariaLabel('Result of submitting report')
      .ok('Oops!')
      );
};

// Register controllers.
SaenuriYoungModule.controller('TopPageController', ['$scope', '$mdDialog', 'AuthService', TopPageController]);
SaenuriYoungModule.controller('AddressBookController', ['$scope', '$mdDialog', 'AuthService', AddressBookController]);
SaenuriYoungModule.controller('SubmitReportController', ['$scope', '$location', '$mdDialog', 'AuthService', SubmitReportController]);

// Router.
SaenuriYoungModule.config(function($routeProvider) {
  var AuthServiceResolve = {
    'AuthServiceData': function(AuthService) {
      return AuthService.promise;
    }
  };

  $routeProvider.when('/', {
    templateUrl: '/list_groups.html',
    controller: AddressBookController,
    controllerAs: 'addressBookCtrl',
    resolve: AuthServiceResolve
  })
  .when('/report', {
    templateUrl: '/report.html',
    controller: SubmitReportController,
    controllerAs: 'submitReportCtrl',
    resolve: AuthServiceResolve
  })
});
