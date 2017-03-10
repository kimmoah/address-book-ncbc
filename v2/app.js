// Define the main module.
SaenuriYoungModule = angular.module('SaenuriYoungModule',['ngMaterial', 'ngRoute', 'ngMessages', 'md.data.table', AuthServiceModule.name, GroupsServiceModule.name, ChartsServiceModule.name, 'ngclipboard']);


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
  if (!this.isAuthServiceInitialized) {
    this.alertAuthIsNotReady_();
    return;
  }
  gapi.auth2.getAuthInstance().signIn();
};
TopPageController.prototype.handleSignoutClick = function() {
  if (!this.isAuthServiceInitialized) {
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

// Register controllers.
SaenuriYoungModule.controller('TopPageController', ['$scope', '$mdDialog', '$location', 'AuthService', TopPageController]);
SaenuriYoungModule.controller('AddressBookController', ['$scope', '$mdDialog', '$mdMenu', 'GroupsService', AddressBookController]);
SaenuriYoungModule.controller('SubmitReportController', ['$scope', '$location', '$mdDialog', 'AuthService', SubmitReportController]);
SaenuriYoungModule.controller('ReportSummaryController', ['$scope', 'GroupsService', ReportSummaryController]);
SaenuriYoungModule.controller('GroupAnalysisController', ['$scope', '$location', '$window', 'ChartsService', GroupAnalysisController]);

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

SaenuriYoungModule.directive('memberStatusIcon',
    function() {
        return {
            scope: {
              status: '@',
              gray: '@'
            },
            link: function($scope, element) {
              $scope['memberStatus'] = MemberData.status[$scope['status']];
            },
            template: '<md-icon ng-if="memberStatus.materialIconClass" class="material-icons"aria-label="Attendance Icon" ng-style="memberStatus.getColor(gray)">{{memberStatus.materialIconClass}}</md-icon>' +
            '<md-icon ng-if="memberStatus.svgSrc" md-svg-src="{{memberStatus.svgSrc}}" aria-label="Attendance Icon" ng-style="memberStatus.getColor(gray)"></md-icon>'
        };
    }
);
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
  .when('/group_analysis', {
    templateUrl: '/group_analysis.html',
    controller: GroupAnalysisController,
    controllerAs: 'groupAnalysisCtrl',
    resolve: AuthServiceResolve
  })
});
