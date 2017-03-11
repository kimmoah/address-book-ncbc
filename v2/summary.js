// Summary per tier.
TierSummary = function(name, backgroundColor) {
  this.name = name;
  this.backgroundColor = backgroundColor;
  this.groups = [];
  this.attendance = new AttendanceCounter();
};

TierSummary.prototype.cardTitleStyle = function() {
  return {'background-color': this.backgroundColor, 'color': 'white'};
};

// Summary per small group.
GroupSummary = function(group, tier) {
  this.group = group;
  this.loadingStatus = null;
  this.attendance = null;
  this.members = null;

  // Tier that this group belongs to.
  this.tier = tier;
};

// Initializes this group with members loaded by MemberDataFromSheet().
GroupSummary.prototype.loadMembers = function(members) {
  this.attendance = new AttendanceCounter();
  this.attendance.increment(members);
  this.members = members;
};

ReportSummaryController = function($scope, $location, GroupsService) {
  this.$scope = $scope;
  this.$location = $location;
  this.GroupsService = GroupsService;
  this.memberStatus = MemberData.status;

  var search = $location.search();

  this.progress = 0;

  this.total = new AttendanceCounter();
  this.numReports = 0;
  this.numLoadedReports = 0;
  this.summaryPerTier = {};

  var date = new Date(parseInt(search['date'], 10));
  if (Object.prototype.toString.call(date) === "[object Date]" &&
      !isNaN( date.getTime())) {
    this.currentReportDate = date;
  } else {
    this.currentReportDate = thisWeekSunday();
  }

  // Sheet containing information of every group.
  GroupsService.listen(angular.bind(this, this.handleLoadingAllGroups));
  if (GroupsService.allGroupSheet) {
    this.handleLoadingAllGroups(GroupsService.allGroupSheet);
  }
};

ReportSummaryController.prototype.handleLoadingAllGroups = function(allGroups) {
  this.total = new AttendanceCounter();
  this.numReports = 0;
  this.numLoadedReports = 0;
  this.summaryPerTier = {};

  if (!allGroups) {
    return;
  }
  var tierColors = ['#039BE5', '#9C27B0', '#009688', '#43A047'];
  var currentColorIndex = 0;

  this.total = new AttendanceCounter();
  for (var i = 0; i < allGroups.length; ++i) {
    var group = allGroups[i];
    if (!group.reportSheetId || group.tier == 'test') {
      continue;
    }
    ++this.numReports;

    if (!(group.tier in this.summaryPerTier)) {
      this.summaryPerTier[group.tier] =
        new TierSummary(group.tier, tierColors[currentColorIndex]);
      ++currentColorIndex;
    }
    var tier = this.summaryPerTier[group.tier]; 
    var summary = new GroupSummary(group, tier);
    tier.groups.push(summary);

    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: group.reportSheetId,
      range: this.reportTitle() + '!A1:D100'
      }).then(angular.bind(this, this.handleLoadingReport, summary),
        angular.bind(this, this.handleLoadingReportFailure, summary));
  }
};

ReportSummaryController.prototype.reportTitle = function() {
  return dateToReportTitle(this.currentReportDate);
};

ReportSummaryController.prototype.handleLoadingReport = function(groupSummary, response) {
  ++this.numLoadedReports;
  this.progress = this.numLoadedReports * 100 / this.numReports;

  var members = MemberDataFromSheet(response);
  this.total.increment(members);
  groupSummary.tier.attendance.increment(members);
  groupSummary.loadMembers(members);
  this.$scope.$apply();
};

ReportSummaryController.prototype.handleLoadingReportFailure = function(groupSummary, response) {
  ++this.numLoadedReports;
  this.progress = this.numLoadedReports * 100 / this.numReports;

  if (response.status == 403) {
    groupSummary.loadingStatus = '접근 권한이 없습니다';
  } else {
    groupSummary.loadingStatus = '리포트가 아직 작성되지 않았습니다';
  }
  this.$scope.$apply();
};

ReportSummaryController.prototype.dateChange = function() {
  var search = this.$location.search();
  search['date'] = this.currentReportDate.getTime();
  this.$location.search(search);
};

ReportSummaryController.prototype.onlySundayPredicate = function(date) {
  var day = date.getDay();
  return day === 0;
};

