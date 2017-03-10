MemberStatus = function(text, iconColor, materialIconClass, svgSrc, attend) {
  this.text = text;
  this.iconColor = iconColor;
  this.materialIconClass = materialIconClass;
  this.svgSrc = svgSrc;
  this.attend = attend;
};

MemberStatus.prototype.getColor = function(gray) {
  if (gray === 'true') {
    return {'color': '#9e9e9e' };
  }
  return {'color': this.iconColor};
};

MemberData = function(name) {
  this.name = name;
  this.status = 0;
  this.prayer = '';
  this.note = '';
};

MemberData.status = [
  new MemberStatus('잘 모름', '#212121', 'help', '', false),
  new MemberStatus('모두 참석하지 않음', '#B71C1C', 'cancel', '', false),
  new MemberStatus('예배만 참석', '#00E676', '', 'church.svg', true),
  new MemberStatus('목장만 참석', '#FFEB3B', 'people', '', true),
  new MemberStatus('예배 및 목장 참석', '#0091EA', 'thumb_up', '', true)
];

MemberData.prototype.materialIconClass = function() {
  return MemberData.status[this.status].materialIconClass;
};

MemberData.prototype.svgSrc = function() {
  return MemberData.status[this.status].svgSrc;
};

MemberData.prototype.statusIconColor = function(targetStatus) {
  return MemberData.status[this.status].getColor(this.status != targetStatus);
};

MemberData.prototype.getReportArray = function() {
  var ret = [];
  ret.push(this.name);
  ret.push(MemberData.status[this.status].text);
  ret.push(this.prayer);
  ret.push(this.note);

  return ret;
};

AttendanceCounter = function() {
  this.numMembers = 0;
  this.memberStatus = MemberData.status;
  this.numAttends = 0;
  // Initialize counter per status.
  this.statusCount = [];
  for (var i = 0; i < MemberData.status.length; ++i) {
    this.statusCount.push(0);
  }
};

AttendanceCounter.prototype.attendPercent = function() {
  return this.numAttends * 100 / this.numMembers;
};

AttendanceCounter.prototype.numAbsent = function() {
  return this.numMembers - this.numAttends;
};

AttendanceCounter.prototype.absentPercent = function() {
  return this.numAbsent() * 100 / this.numMembers;
};

AttendanceCounter.prototype.increment = function(members) {
  this.numMembers += members.length;
  for (var i = 0; i < members.length; ++i) {
    ++this.statusCount[members[i].status];
    if (this.memberStatus[members[i].status].attend) {
      ++this.numAttends;
    }
  }
};

// Member data from the report.
function MemberDataFromSheet(response) {
  var members = [];
  if (!response.result.values) {
    return members;
  }

  // The first row is the title and the second row is the group note.
  for (var i = 2; i < response.result.values.length; ++i) {
    var memberData = new MemberData(response.result.values[i][0]);
    memberData.prayer = response.result.values[i][2];
    memberData.note = response.result.values[i][3];
    for (var j = 0; j < MemberData.status.length; ++j) {
      if (MemberData.status[j].text == response.result.values[i][1]) {
        memberData.status = j;
        break;
      }
    }
    members.push(memberData);
  }
  return members;
}
