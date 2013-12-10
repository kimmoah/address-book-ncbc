#!/usr/bin/python

try:
  from xml.etree import ElementTree
except ImportError:
  from elementtree import ElementTree
from sets import Set

import gdata.apps.groups.client
import gdata.spreadsheet.service
import gdata.service
import atom.service
import gdata.spreadsheet
import atom
import getopt
import sys
import string
import re

class NCBCTimothyAddressSpreadsheet:

  def __init__(self, email, password):
    self.gd_client = gdata.spreadsheet.service.SpreadsheetsService()
    self.gd_client.email = email
    self.gd_client.password = password
    self.gd_client.source = 'Spreadsheets GData Sample'
    self.gd_client.ProgrammaticLogin()
    self.curr_wksht_id = ''
    self.list_feed = None
    self.answer_all = False

    self.domain = 'ncbctimothy.org'
    self.groupClient = gdata.apps.groups.client.GroupsProvisioningClient(domain=self.domain)
    self.groupClient.ClientLogin(email=email, password=password, source='apps')
    all_groups = self.groupClient.RetrieveAllGroups()
    print('All mailing lists')
    for group in all_groups.entry:
      print '\t', group.GetGroupName(), group.GetGroupId()

  def _CheckSpreadsheetAddress(self, spread_sheet_key):
    feed = self.gd_client.GetWorksheetsFeed(spread_sheet_key)
    mokjang_re = re.compile('(.*)\(([a-z]+)\)')
    for i, entry in enumerate(feed.entry):
      mokjang_result = mokjang_re.match(entry.title.text)
      if mokjang_result:
        email_group_id = mokjang_result.group(2)
        email_group_id += '@'
        email_group_id += self.domain
        print 'Checking %s (Email = %s)' % (mokjang_result.group(1), email_group_id)
        id_parts = feed.entry[i].id.text.split('/')
        curr_wksht_id = id_parts[len(id_parts) - 1]
	list_feed = self.gd_client.GetListFeed(spread_sheet_key, curr_wksht_id)
        member_email_dict = {} 
        for i, entry in enumerate(list_feed.entry):
          name = entry.custom['name'].text.strip()
          email = entry.custom['email'].text
          if email:
            # Some email address is None
            email = email.strip()
          print '  %s: %s' % (name, email)
          member_email_dict[email] = name
        group_mailing_set = Set()
        self._CheckMailingList(email_group_id, group_mailing_set)

        members_not_in_group = Set()
        unknown_group_mails = Set()
        self._CompareMailingList(member_email_dict, group_mailing_set, members_not_in_group, unknown_group_mails)

     #   print 'Members not in the mailing list: ', members_not_in_group
     #   print 'Group mailing list not in the address:', unknown_group_mails
        self._UpdateMailingList(email_group_id, member_email_dict, members_not_in_group, unknown_group_mails)

  def _CheckMailingList(self, group_id, email_lists):
    all_members = self.groupClient.RetrieveAllMembers(group_id)
    for i, entry in enumerate(all_members.entry):
      email_lists.update([entry.GetMemberId()])

  def _CompareMailingList(self, spreadsheet_email_dict, group_mailing_set, members_not_in_group, unknown_group_mails):
    for email, name in spreadsheet_email_dict.iteritems():
      if not email in group_mailing_set:
        members_not_in_group.update([email])
    for group_member in group_mailing_set:
      if not spreadsheet_email_dict.has_key(group_member):
        unknown_group_mails.update([group_member])

  def _UpdateMailingList(self, email_group_id, member_email_dict, members_not_in_group, unknown_group_mails):
    for email in members_not_in_group:
      member_name = member_email_dict[email]
      if not email:
        print ('Skip ' + member_name + ' because he/she does not have an email address.')
        continue
      message = 'Do you want to add '
      message = message + member_name
      message = message + '(' + email + ') to group ' + email_group_id
      print message,
      if self.answer_all: 
        self.groupClient.AddMemberToGroup(email_group_id, email)
        print ('Added')
        continue

      input = raw_input('(y/n/a)?')
      command = input.split(' ', 1)
      if command[0] == 'y' or command[0] == 'a':
        if command[0] == 'a':
          self.answer_all = True
        self.groupClient.AddMemberToGroup(email_group_id, email)
        print ('Added')
      else:
        print ('Skipped')

    for member_email in unknown_group_mails:
      message = 'Do you want to remove '
      message = message + '"' + member_email + '" from group ' + email_group_id
      print message,
      if self.answer_all: 
        self.groupClient.RemoveMemberFromGroup(email_group_id, member_email)
        print ('Removed')
        continue

      input = raw_input('(y/n/a)?')
      command = input.split(' ', 1)
      if command[0] == 'y' or command[0] == 'a':
        if command[0] == 'a':
          self.answer_all = True
        self.groupClient.RemoveMemberFromGroup(email_group_id, member_email)
        print ('Removed')
      else:
        print ('Skipped')
   

  
  def Run(self):
    # Check 'single Timothy 2012'
    self._CheckSpreadsheetAddress('tIqN7d9096WggJYhJFAofXA')
    # Check 'Event Mailing List'
    self._CheckSpreadsheetAddress('ttfr39JtV6FM_nDCdzVRU1Q')

def main():
  # parse command line options
  try:
    opts, args = getopt.getopt(sys.argv[1:], "", ["user=", "pw="])
  except getopt.error, msg:
    print 'python spreadsheetExample.py --user [username] --pw [password] '
    sys.exit(2)
  
  # Fill following.
  # e.g., YOURID@ncbctimothy.org
  user = 'asiandrummer@ncbctimothy.org'
  pw = 'otsiva86'

  # Process options
  for o, a in opts:
    if o == "--user":
      user = a
    elif o == "--pw":
      pw = a

  if user == '' or pw == '':
    print 'python spreadsheetExample.py --user [username] --pw [password] '
    sys.exit(2)
        
  sample = NCBCTimothyAddressSpreadsheet(user, pw)
  sample.Run()


if __name__ == '__main__':
  main()
