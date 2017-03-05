// Define the main module.
SaenuriYoungModule = angular.module('SaenuriYoungModule',['ngMaterial', 'ngRoute', 'ngMessages', 'md.data.table', AuthServiceModule.name, GroupsServiceModule.name, 'ngclipboard']);


// Contraoller for the top page.
TopPageController = function($scope, $mdDialog, $location, AuthService) {
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  this.$location_ = $location;

  // TopPageController is created before the service is resolved by router,
  // need to be notified by it.
  AuthService.promise.then(angular.bind(this, this.AuthServiceInitDone));
  this.AuthService = AuthService;
  this.isAuthServiceInitialized = false;
  this.addressBookSpreadSheetId = ADDRESSBOOK_ID;
};

TopPageController.prototype.getReportGroupName = function() {
  var search = this.$location_.search();

  return search['name'];
};

TopPageController.prototype.AuthServiceInitDone = function() {
  this.isAuthServiceInitialized = true;
};

TopPageController.prototype.isSignedIn = function() {
  return this.isAuthServiceInitialized && this.AuthService.isSignedIn;
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

// Controller to list every groups.
AddressBookController = function($scope, $mdDialog, $mdMenu, GroupsService) {
  // Store the injected services.
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  this.$mdMenu = $mdMenu;

  // Sheet containing information of every group.
  this.allGroupSheet = GroupsService.allGroupSheet;
  GroupsService.listen(angular.bind(this, this.handleLoadingAllGroups));

  this.groupsOrder = 'name'
};

// Handler when a sheet containing all groups is loaded.
AddressBookController.prototype.handleLoadingAllGroups = function(allGroups) {
  this.allGroupSheet = allGroups;
  this.$scope.$apply();
};

AddressBookController.prototype.getReportTitle = function() {
  return reportTitle();
};

AddressBookController.prototype.openMenu = function($mdMenu, ev) {
  this.$mdMenu.open(ev);
};

SubmitReportController = function($scope, $location, $mdDialog, $window) {
  // Store the injected services.
  this.$scope = $scope;
  this.$mdDialog = $mdDialog;
  this.$location = $location;
  this.$window = $window;


  this.lastSavedTimestamp = 0;

  // To use from the template.
  this.memberStatus = MemberData.status;
  var search = $location.search();

  // Extract name and sheet id from the query parameters.
  this.name = search['name'];
  this.reportSpreadSheetId = search['report_sheetid'];
  this.reportLogRow = search['report_log_row'];
  this.memberData = null;

  // Stored report, object. Key is the name, and value is MemberData.
  // Empty Object means that there is no stored report.
  this.storedReport = null;
  this.numMembersInReport = -1;

  this.groupNote = '';

  this.groupsOrder = 'name'

  this.reportRangeCharacter = 'D';

  // For the sharing prayer dialog.
  this.prayerList = '';

  this.selectedTabIndex = 0;

  if (this.name && this.reportSpreadSheetId) {
    var range = this.name + '!A2:A100';
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: ADDRESSBOOK_ID,
      range: range
    }).then(angular.bind(this, this.handleLoadingGroup),
      angular.bind(this, this.handleLoadingGroupFailure));

    var reportRange =
      reportTitle() + '!A1:' + this.reportRangeCharacter + '100';
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

SubmitReportController.prototype.reportTitle = function() {
  return reportTitle();
};

// Loading members in the group.
SubmitReportController.prototype.handleLoadingGroup = function(response) {
  this.memberData = [];
  if (response.result.values) {
    for (var i = 0; i < response.result.values.length; ++i) {
      this.memberData.push(new MemberData(response.result.values[i][0]));
    }
    this.memberData.sort(function(a, b) {
        if (a.name > b.name) return 1;
        if (a.name < b.name) return -1;
        return 0;
        });
    this.maybeMergeLoadedReport();
  }
  this.$scope.$apply();
};

SubmitReportController.prototype.handleLoadingGroupFailure = function(response) {
  this.$mdDialog.show(
    this.$mdDialog.alert()
    .clickOutsideToClose(true)
    .title('주소록 오류')
    .textContent('"' + this.name + '" 목장 주소록을 찾을 수 없습니다.')
    .ariaLabel('Failed to read addressbook.')
    .ok('닫기')
    );
  this.$location.url('/');
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
  var members = MemberDataFromSheet(response);
  this.numMembersInReport = members.length;
  for (var i = 0; i < members.length; ++i) {
    var memberData = members[i];
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
      .ok('권한 신청하겠습니다.')
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
          'title': reportTitle(),
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

  // DUMMY to delete the old report.
  var dummy = ['', '', '', ''];
  var extraMembers = this.numMembersInReport - this.memberData.length;
  for (var i = 0; i < extraMembers; ++i) {
    values.push(dummy);
  }

  this.reportForm.$setPristine();
  this.lastSavedTimestamp = Date.now();

  var range = reportTitle() + '!A1:' + this.reportRangeCharacter + values.length;
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
  if (this.reportLogRow) {
    var valueRow = [];
    var now = new Date();
    valueRow.push(now.toLocaleDateString() + ' ' + now.toLocaleTimeString());

    var range = '전체 목장!' + REPORT_LOG_COLUMN + this.reportLogRow + ':' +
      REPORT_LOG_COLUMN + this.reportLogRow;
    gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: ADDRESSBOOK_ID,
      valueInputOption: 'USER_ENTERED',
      range: range,
      values: [valueRow]
      }).then(angular.bind(this, this.addReportLogsResponse));
  }

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

SubmitReportController.prototype.sharePrayer = function() {
  this.prayerList = '';
  for (var i = 0; i < this.memberData.length; ++i) {
    var member = this.memberData[i];
    if (member.prayer) {
      this.prayerList += member.name + ': ' + member.prayer + '\n';
    }
  }
  if (this.prayerList) {
    var self = this;
    this.$mdDialog.show({
      controller: function() { return self; },
      controllerAs: 'ctrl',
      templateUrl: 'share_prayer.html',
      parent: angular.element(document.body),
      clickOutsideToClose:true
    })
    .then(function() {
    }, function() {
    });
  } else {
    this.$mdDialog.show(
        this.$mdDialog.alert()
        .clickOutsideToClose(true)
        .title('기도 제목 공유')
        .textContent('멤버들의 기도제목이 하나도 없습니다')
        .ariaLabel('Result of submitting report')
        .ok('닫기')
        );
  }
};

SubmitReportController.prototype.cancelPrayerList = function() {
  this.$mdDialog.cancel();
};

SubmitReportController.prototype.clickAttendance = function(member, status) {
  member.status = status;
  this.reportForm.$setDirty();
};

// Register controllers.
SaenuriYoungModule.controller('TopPageController', ['$scope', '$mdDialog', '$location', 'AuthService', TopPageController]);
SaenuriYoungModule.controller('AddressBookController', ['$scope', '$mdDialog', '$mdMenu', 'GroupsService', AddressBookController]);
SaenuriYoungModule.controller('SubmitReportController', ['$scope', '$location', '$mdDialog', 'AuthService', SubmitReportController]);
SaenuriYoungModule.controller('ReportSummaryController', ['$scope', 'GroupsService', ReportSummaryController]);

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
  .when('/summary', {
    templateUrl: '/summary.html',
    controller: ReportSummaryController,
    controllerAs: 'reportSummaryCtrl',
    resolve: AuthServiceResolve
  })
});
