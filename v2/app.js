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
  this.addressBookSpreadSheetId = ADDRESSBOOK_ID;
};

TopPageController.prototype.AuthServiceInitDone = function() {
  this.isAuthServiceInitialized_ = true;
};

TopPageController.prototype.isSignedIn = function() {
  return this.isAuthServiceInitialized_ && this.AuthService.isSignedIn;
};

TopPageController.prototype.getUserEmail = function() {
  if (!this.isSignedIn()) {
    return '';
  }
  return gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getEmail();
};

TopPageController.prototype.getUserImageUrl = function() {
  if (!this.isSignedIn()) {
    return '';
  }
  return gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile().getImageUrl();
};

TopPageController.prototype.getUserTooltip = function() {
  if (!this.isSignedIn()) {
    return '';
  }
  var basicProfile =
    gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
  return basicProfile.getName() + ' (' + basicProfile.getEmail() + ')';
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

GroupData = function(group) {
  this.name = group[0];
  this.leader = group[2];
  this.reportSheetId = null;

  if (group.length > 3) {
    // Extract spreadsheet id from the link.
    var spreadsheetAddress = group[3];
    var ID_PATH = 'spreadsheets/d/';
    var index = spreadsheetAddress.indexOf(ID_PATH);
    if (index != -1) {
      var idEnd = spreadsheetAddress.indexOf('/', index + ID_PATH.length);
      this.reportSheetId = spreadsheetAddress.substring(index + ID_PATH.length, idEnd);
    }
  }
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

  this.groupsOrder = 'name'

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
      spreadsheetId: ADDRESSBOOK_ID
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
  this.allGroupSheet = [];
  for (var i = 0; i < response.result.values.length; ++i) {
    this.allGroupSheet.push(new GroupData(response.result.values[i]));
  }
  this.$scope.$apply();
};

// Returns a link of report for each group.
AddressBookController.prototype.getReportLink = function(group) {
  var link = '/#/report?name=' + group.name + '&report_sheetid=' + group.reportSheetId;
  return link;
};

MemberStatus = function(text, iconColor, materialIconClass, svgSrc) {
  this.text = text;
  this.iconColor = iconColor;
  this.materialIconClass = materialIconClass;
  this.svgSrc = svgSrc;
};

MemberData = function(name) {
  this.name = name;
  this.status = 0;
  this.prayer = '';
  this.note = '';
};

MemberData.status = [
  new MemberStatus('잘 모름', '#212121', 'help', ''),
  new MemberStatus('모두 참석하지 않음', '#B71C1C', 'cancel', ''),
  new MemberStatus('예배만 참석', '#00E676', '', 'church.svg'),
  new MemberStatus('목장만 참석', '#FFEB3B', 'people', ''),
  new MemberStatus('예배 및 목장 참석', '#0091EA', 'thumb_up', '')
];

MemberData.prototype.statusIconColor = function(targetStatus) {
  if (this.status != targetStatus) {
    return {'color': '#9e9e9e'};
  } else {
    return {'color': MemberData.status[this.status].iconColor};
  }
};

MemberData.prototype.getReportArray = function() {
  var ret = [];
  ret.push(this.name);
  ret.push(MemberData.status[this.status].text);
  ret.push(this.prayer);
  ret.push(this.note);

  return ret;
};

SubmitReportController = function($scope, $location, $mdDialog, $window) {
  // Store the injected services.
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  this.$location = $location;
  this.$window = $window;

  // To use from the template.
  this.memberStatus = MemberData.status;
  var search = $location.search();

  // Extract name and sheet id from the query parameters.
  this.name = search['name'];
  this.reportSpreadSheetId = search['report_sheetid'];
  this.memberData = null;

  // Stored report, object. Key is the name, and value is MemberData.
  // Empty Object means that there is no stored report.
  this.storedReport = null;

  this.groupNote = '';

  this.groupsOrder = 'name'

  this.reportRangeCharacter = 'D';

  // If true render, only Name and Prayer subject columns in the table.
  this.prayerMode = false;

  if (this.name && this.reportSpreadSheetId) {
    var range = this.name + '!A2:A100';
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: ADDRESSBOOK_ID,
      range: range
    }).then(angular.bind(this, this.handleLoadingGroup));

    var reportRange =
      this.reportTitle() + '!A1:' + this.reportRangeCharacter + '100';
    console.log(reportRange);
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.reportSpreadSheetId,
      range: reportRange
    }).then(angular.bind(this, this.handleLoadingReport),
      angular.bind(this, this.handleLoadingReportFailure));
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
  this.memberData.sort(function(a, b) {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
      });
  this.maybeMergeLoadedReport();
  this.$scope.$apply();
};

SubmitReportController.prototype.handleLoadingReport = function(response) {
  this.storedReport = {}
  if (!response.result.values) {
    return;
  }
  // The first row is the group note.
  if (response.result.values.length > 1) {
    this.groupNote = response.result.values[0][1];
  }
  for (var i = 1; i < response.result.values.length; ++i) {
    var memberData = new MemberData(response.result.values[i][0]);
    memberData.prayer = response.result.values[i][2];
    memberData.note = response.result.values[i][3];
    var statusIndex = MemberData.status.indexOf(response.result.values[i][1]);
    if (statusIndex != -1) {
      memberData.status = statusIndex;
    }
    this.storedReport[memberData.name] = memberData;
  }
  this.maybeMergeLoadedReport();
  this.$scope.$apply();
};

SubmitReportController.prototype.maybeMergeLoadedReport = function() {
  if (!this.memberData || !this.storedReport) {
    return;
  }
  for (var i = 0; i <this.memberData.length; ++i) {
    if (this.memberData[i].name in this.storedReport) {
      // Use data in the loaded.
      this.memberData[i] = this.storedReport[this.memberData[i].name];
    }
  }
};

SubmitReportController.prototype.handleLoadingReportFailure = function(response) {
  if (response.status == 403) {
    // Does not have permission to the doc.
    var confirm = this.$mdDialog.confirm()
      .title('리포트 접근 권한 오류' )
      .textContent(this.name + ' 목장 리포트에 접근할 수 없습니다.')
      .ariaLabel('Alert Dialog Demo')
      .ok('권한 신청하러 이동하겠습니다.')
      .cancel('취소하겠습니다');
    var self = this;
    this.$mdDialog.show(confirm).then(function() {
      self.$window.location.href = 
        'https://docs.google.com/spreadsheets/d/' + self.reportSpreadSheetId;
      }, function() {
      self.$location.url('/');
      });
  } else {
    this.storedReport = {};
    this.$scope.$apply();
  }
};

// Title of the report, which will be the name of the sheet.
SubmitReportController.prototype.reportTitle = function() {
  var today = new Date();
  var diff = today.getDate() - today.getDay();
  var sunday = new Date(today.setDate(diff));
  return sunday.getFullYear() + '/' + (sunday.getMonth()+1) + '/' + sunday.getDate();
};

// Submit the report.
SubmitReportController.prototype.submitReport = function(response) {
  // Do not need to create a sheet if it is already there.
  if (Object.keys(this.storedReport).length > 0) {
    this.addReportSheet();
    return;
  }
  // First, create the sheet.
  gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: this.reportSpreadSheetId,
    'requests': [{
      'addSheet': {
        'properties': {
          'title': this.reportTitle(),
          'gridProperties': {
            'rowCount': 100,  // give enough number.
            'frozenRowCount': 1,
            'columnCount': 4
          }      } }
    }]
  }).then(angular.bind(this, this.createSheetSucess),
          angular.bind(this, this.createSheetFail));
};

SubmitReportController.prototype.createSheetSucess = function(response) {
/*
  var gridRange = {
    'sheetId': response.result.replies[0].addSheet.properties.sheetId,
    'startRowIndex': 1,
    'endRowIndex': 100,
    'startColumnIndex': 1,
    'endColumnIndex': 1,
  };
  var values = [];
  for (var i = 0; i < MemberData.status.length; ++i) {
    values.push({'userEnteredValue': MemberData.status[i]});
  }
  gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId: this.reportSpreadSheetId,
    'requests': [{
      'setDataValidation': {
        'range': gridRange,
        'rule': {
          'condition': {
            'type': ConditionType.TEXT_EQ,
            'values': values
          }
        }
      }
    }]
  }).then(angular.bind(this, this.addReportSheet),
    angular.bind(this, this.addReportSheet));
*/

  this.addReportSheet();
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
SubmitReportController.prototype.addReportSheet = function() {
  var values = [];

  var headRow = [];
  headRow.push('이름');
  headRow.push('출석');
  headRow.push('기도제목');
  headRow.push('메모');
  values.push(headRow);

  var groupNote = [];
  groupNote.push('목장 노트');
  groupNote.push('N/A');
  groupNote.push('N/A');
  groupNote.push(this.groupNote);

  values.push(groupNote);
  for (var i = 0; i < this.memberData.length; ++i) {
    values.push(this.memberData[i].getReportArray());
  }

  var range = this.reportTitle() + '!A1:' + this.reportRangeCharacter + values.length;
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
  }).then(angular.bind(this, this.addReportLogsResponse));

  this.$mdDialog.show(
      this.$mdDialog.alert()
      .clickOutsideToClose(true)
      .title('성공')
      .textContent('목장 리포트를 성공적으로 저장하였습니다!')
      .ariaLabel('Result of submitting report')
      .ok('Got it!')
      );
};

SubmitReportController.prototype.addReportLogsResponse = function(response) {
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

// Copied from http://stackoverflow.com/questions/17772260/textarea-auto-height.
SaenuriYoungModule.directive('elastic', [
    '$timeout',
    function($timeout) {
        return {
            restrict: 'A',
            link: function($scope, element) {
                $scope.initialHeight = $scope.initialHeight || element[0].style.height;
                var resize = function() {
                    element[0].style.height = $scope.initialHeight;
                    if (element[0].scrollHeight > 0) {
                      element[0].style.height = "" + element[0].scrollHeight + "px";
                    }
                };
                element.on("input change", resize);
                $timeout(resize, 0);
            }
        };
    }
]);
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
