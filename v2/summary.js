AttendenceCounter = function() {
  this.numMembers = 0;
  this.memberStatus = MemberData.status;
  // Initialize counter per status.
  this.statusCount = [];
  for (var i = 0; i < MemberData.status.length; ++i) {
    this.statusCount.push(0);
  }
};
AttendenceCounter.prototype.increment = function(members) {
  this.numMembers += members.length;
  for (var i = 0; i < members.length; ++i) {
    ++this.statusCount[members[i].status];
  }
};

AttendenceSummary = function(name) {
  this.name = name;
  this.attendence = new AttendenceCounter();
};

TierSummary = function(name, backgroundColor) {
  this.name = name;
  this.backgroundColor = backgroundColor;
  this.groups = [];
  this.attendence = new AttendenceCounter();
};

TierSummary.prototype.cardTitleStyle = function() {
  return {'background-color': this.backgroundColor, 'color': 'white'};
};

GroupSummary = function(group, tier) {
  this.group = group;
  this.loadingStatus = null;
  this.attendence = null;
  this.members = null;

  // TierSummary.
  this.tier = tier;
};

GroupSummary.prototype.loadMembers = function(members) {
  this.attendence = new AttendenceCounter();
  this.attendence.increment(members);
  this.members = members;
};

ReportSummaryController = function($scope, GroupsService) {
  this.$scope = $scope;
  this.GroupsService = GroupsService;
  this.memberStatus = MemberData.status;

  this.progress = 0;

  // Sheet containing information of every group.
  GroupsService.listen(angular.bind(this, this.handleLoadingAllGroups));
  this.handleLoadingAllGroups(GroupsService.allGroupSheet);

  this.total = new AttendenceCounter();
  this.numReports = 0;
  this.numLoadedReports = 0;
  this.summaryPerTier = {};
};

ReportSummaryController.prototype.handleLoadingAllGroups = function(allGroups) {
  this.total = new AttendenceCounter();
  this.numReports = 0;
  this.numLoadedReports = 0;
  this.summaryPerTier = {};

  if (!allGroups) {
    return;
  }
  var tierColors = ['#039BE5', '#9C27B0', '#009688', '#43A047'];
  var currentColorIndex = 0;

  this.total = new AttendenceCounter();
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
      range: reportTitle() + '!A1:D100'
      }).then(angular.bind(this, this.handleLoadingReport, summary),
        angular.bind(this, this.handleLoadingReportFailure, summary));
  }
};

ReportSummaryController.prototype.handleLoadingReport = function(groupSummary, response) {
  ++this.numLoadedReports;
  this.progress = this.numLoadedReports * 100 / this.numReports;

  var members = MemberDataFromSheet(response);
  this.total.increment(members);
  groupSummary.tier.attendence.increment(members);
  groupSummary.loadMembers(members);
  this.$scope.$apply();
};

ReportSummaryController.prototype.handleLoadingReportFailure = function(
    groupSummary, response) {
  ++this.numLoadedReports;
  this.progress = this.numLoadedReports * 100 / this.numReports;

  if (response.status == 403) {
    groupSummary.loadingStatus = '접근 권한이 없습니다';
  } else {
    groupSummary.loadingStatus = '리포트가 아직 작성되지 않았습니다';
  }
  this.$scope.$apply();
};
