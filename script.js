window.addEventListener('cloudkitloaded', function() {
	"use strict";
	//SETUP AUTH AND CONFIGURATION FOR CLOUDKIT
	CloudKit.configure({
		containers: [{
			containerIdentifier: 'iCloud.Anslate',
			apiTokenAuth: {
                // YOUR CLOUDKIT TOKEN
				apiToken: 'XXXXXXXXXXXXXXXX',
				persist: true
			},
			environment: 'development'
		}]
	});

	function MedicalTermViewModel() {
		var self = this;
		var container = CloudKit.getDefaultContainer();
		var publicDB = container.publicCloudDatabase;
        var recordTypeName = "MedicalTerm";

		self.medicalTerms = ko.observableArray();
		self.displayUserName = ko.observable('Unauthenticated User');

		self.newMedicalVisible = ko.observable(false);
		self.newMedicalName = ko.observable('');
		self.newMedicalDetail = ko.observable('');

		self.saveButtonEnabled = ko.observable(true);

		self.saveNewMedicalTerm = function() {
			if (self.newMedicalName().length > 0 && self.newMedicalDetail().length > 0) {
				self.saveButtonEnabled(false);

				var record = {
					//TABLE NAME
					recordType: recordTypeName,
					//FIELDS NAME IN CLOUDKIT
					fields: {
						name: {
							value: self.newMedicalName()
						},
						detail: {
							value: self.newMedicalDetail()
						}
					}
				};

                // SAVE TO CLOUDKIT
				publicDB.saveRecord(record).then(
					function(response) {
						if (response.hasErrors) {
							console.error(response.errors[0]);
							self.saveButtonEnabled(true);
							return;
						}
						var createdRecord = response.records[0];
						self.medicalTerms.push(createdRecord);

						self.newMedicalName("");
						self.newMedicalDetail("");
						self.saveButtonEnabled(true);
					}
				);

			}
			else {
				alert('Medical Term must have a name and detail');
			}
		};

        // FETCH DATA
		self.fetchRecords = function() {
			var query = { recordType: recordTypeName };
			return publicDB.performQuery(query).then(function (response) {
				if(response.hasErrors) {
					console.error(response.errors[0]);
					return;
				}
				var records = response.records;
				var numberOfRecords = records.length;
				if (numberOfRecords === 0) {
					console.error('No matching');
					return;
				}

				self.medicalTerms(records);
			});
		};

		self.gotoAuthenticatedState = function(userInfo) {
			if(userInfo.isDiscoverable) {
				self.displayUserName(userInfo.givenName + ' ' + userInfo.familyName);
			} else {
				self.displayUserName('User record name: ' + userInfo.userRecordName);
			}
			self.newMedicalVisible(true);
			container
			.whenUserSignsOut()
			.then(self.gotoUnauthenticatedState);
		};

		self.gotoUnauthenticatedState = function(error) {
			if(error && error.ckErrorCode === 'AUTH_PERSIST_ERROR') {
				showDialogForPersistError();
			}
			self.newMedicalVisible(false);

			self.displayUserName('Unauthenticated User');

			container
			.whenUserSignsIn()
			.then(self.gotoAuthenticatedState)
			.catch(self.gotoUnauthenticatedState);
		};

		container.setUpAuth().then(function(userInfo) {
			if(userInfo) {
				self.gotoAuthenticatedState(userInfo);
			} else {
				self.gotoUnauthenticatedState();
			}
			// IF RECORD TYPE IS PUBLIC, WITHOUT SIGN IN YOU CAN FETCH THAT
			self.fetchRecords();
		});

	}
	ko.applyBindings(new MedicalTermViewModel());
});