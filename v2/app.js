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
  this.AuthService = AuthService;

  this.sheets = null;
  this.allGroupSheet = null;

  gapi.auth2.getAuthInstance().isSignedIn.listen(
      angular.bind(this, this.UpdateSigninStatus));

  if (AuthService.isSignedIn) {
    this.UpdateSigninStatus(true);
  }
};

AddressBookController.prototype.UpdateSigninStatus = function(isSignedIn) {
  console.log('AddressBookController.prototype.UpdateSigninStatus');
  if (this.AuthService.isSignedIn) {
    console.log(this.allGroupSheets);
    if (!this.allGroupSheets) {
      gapi.client.sheets.spreadsheets.get({
      spreadsheetId: '1E11ya9JAGIrHKLdgZccxPpzWSbQzw6MFLXq7f6tOy-U'
    }).then(angular.bind(this, this.handleLoadingSheets));
    }
  } else {
    this.allGroupSheet = null;
    this.$scope.$apply();
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
  ret.push(MemberData.status[this.status]);
  ret.push(this.note);

  return ret;
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
  return today.getFullYear() + '/' + (today.getMonth()+1) + '/' + today.getDate();
};

SubmitReportController.prototype.submitReport = function(response) {
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

SubmitReportController.prototype.createSheetFail = function(response) {
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
};

/**
 * <response> maybe null;
*/
SubmitReportController.prototype.addReportSheet = function(response) {
  console.log(response);
  var range = this.reportTitle() + '!A1:C' + (this.memberData.length + 1);

  var values = [];
  var groupNote = [];
  groupNote.push('목장 노트');
  groupNote.push(this.groupNote);
  values.push(groupNote);
  for (var i = 0; i < this.memberData.length; ++i) {
    values.push(this.memberData[i].getReportArray());
  }
  console.log(values);
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
