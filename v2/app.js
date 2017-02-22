SaenuriYoungModule = angular.module('SaenuriYoungModule',['ngMaterial', 'ngRoute', 'ngMessages', 'md.data.table', AuthServiceModule.name]);

var ADDRESSBOOK_ID = '1E11ya9JAGIrHKLdgZccxPpzWSbQzw6MFLXq7f6tOy-U';

TopPageController = function($scope, AuthService) {
this.$scope = $scope;
console.log('Start Top Page');
AuthService.promise.then(angular.bind(this, this.AuthServiceInitDone));
  this.AuthService = AuthService;
};

TopPageController.prototype.AuthServiceInitDone = function() {
  console.log('Initializing auth service is done');
};

TopPageController.prototype.isSignedIn = function() {
  return this.AuthService.isSignedIn;
};

TopPageController.prototype.handleAuthClick = function() {
  console.log('Click signin');
  gapi.auth2.getAuthInstance().signIn();
};
TopPageController.prototype.handleSignoutClick = function() {
    console.log('Click signout');
    gapi.auth2.getAuthInstance().signOut();
};

AddressBookController = function($scope, $mdDialog, AuthService) {
  console.log('Start controller');
  console.log(AuthService);
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  this.isSignedIn = false;

  this.sheets = null;
  this.allGroupSheet = null;
  if (AuthService.isSignedIn) {
    gapi.client.sheets.spreadsheets.get({
      spreadsheetId: '1E11ya9JAGIrHKLdgZccxPpzWSbQzw6MFLXq7f6tOy-U'
    }).then(angular.bind(this, this.handleLoadingSheets));
}
};

AddressBookController.prototype.initClient = function() {
  console.log('initClient');

  var CLIENT_ID = '1031261625328-bti3hb1raq4jd0apfb8e1lu1udgl6a8p.apps.googleusercontent.com';

  // Array of API discovery doc URLs for APIs used by the quickstart
  var DISCOVERY_DOCS = ['https://sheets.googleapis.com/$discovery/rest?version=v4'];

  // Authorization scopes required by the API; multiple scopes can be
  // included, separated by spaces.
  var SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

  var Self = this;
  gapi.client.init({
    discoveryDocs: DISCOVERY_DOCS,
    clientId: CLIENT_ID,
    scope: SCOPES
    }).then(angular.bind(this, this.clientInit));
};

AddressBookController.prototype.clientInit = function() {
	console.log(gapi.auth2.getAuthInstance());
	// Listen for sign-in state changes.
	gapi.auth2.getAuthInstance().isSignedIn.listen(angular.bind(this, this.updateSigninStatusCallback));
	this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
};

AddressBookController.prototype.updateSigninStatusCallback = function(isSignedIn) {
  console.log('callback');
  this.updateSigninStatus(isSignedIn);
  this.$scope.$apply();
};

AddressBookController.prototype.updateSigninStatus = function(isSignedIn) {
  console.log('Before: ' + this.isSignedIn);
  this.isSignedIn = isSignedIn;
  console.log('After: ' + this.isSignedIn);

  if (this.isSignedIn && !this.sheets) {
  }
};

AddressBookController.prototype.handleLoadingAllGroups = function(response) {
  this.allGroupSheet = response.result;
  console.log(this.allGroupSheet);
  this.$scope.$apply();
};

AddressBookController.prototype.handleLoadingSheets = function(response) {
  this.sheets = response.result;
  console.log(this.sheets);
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
    console.log(allGroupSheet);
    var gridProperties = allGroupSheet.properties.gridProperties;
    var startRow = gridProperties.frozenRowCount + 1;
    // TODO(youngjin): Use this instead of hard-coded 'C'.
    var endColumn = gridProperties.columnCount;
    var range = allGroupSheet.properties.title + '!A' + startRow  + ':D' + gridProperties.rowCount;
    console.log(range);
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

AddressBookController.prototype.getReportLink = function(group) {
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
  ret.push(MemberData.status[this.status];
  ret.push(this.note);
};

SubmitReportController = function($scope, $location, $mdDialog) {
  console.log('Start Submit Report Controller');
  this.memberStatus = MemberData.status;
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  var search = $location.search();
  this.name = search['name'];
  this.reportSpreadSheetId = search['report_sheetid'];
  this.memberData = null;
  this.groupNote = '';
  if (this.name) {
    var range = this.name + '!A2:A100';
    console.log(range);
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: ADDRESSBOOK_ID,
      range: range
    }).then(angular.bind(this, this.handleLoadingGroup));
}
};
SubmitReportController.prototype.handleLoadingGroup = function(response) {
  this.memberData = [];
  for (var i = 0; i < response.result.values.length; ++i) {
    this.memberData.push(new MemberData(response.result.values[i][0]));
  }
  console.log(this.memberData);
  this.$scope.$apply();
};

SubmitReportController.prototype.reportTitle = function() {
  var today = new Date();
  return today.getFullYear() + '/' + today.getMonth() + '/' + today.getDate();
};

SubmitReportController.prototype.submitReport = function(response) {
  console.log('Submit!!');
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
  }).then(angular.bind(this, this.addReportSheet));
};

SubmitReportController.prototype.addReportSheet = function(response) {
  console.log(response);
  var range = this.reportTitle() + '!A1:C' + (this.memberData.length + 1);

  var values = [];
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
  }).then(angular.bind(this, this.addReportSheetReponse));
};

SubmitReportController.prototype.addReportSheetReponse = function(response) {
  console.log(response);
};

SaenuriYoungModule.controller('TopPageController', ['$scope', 'AuthService', TopPageController]);
SaenuriYoungModule.controller('AddressBookController', ['$scope', '$mdDialog', 'AuthService', AddressBookController]);
SaenuriYoungModule.controller('SubmitReportController', ['$scope', '$location', '$mdDialog', 'AuthService', SubmitReportController]);

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
