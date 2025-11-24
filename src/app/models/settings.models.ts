export interface ApplicationSettings {
  id?: string;
  acceptingApplications: boolean;
  lastUpdatedBy: string;
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplicationSettingsUpdate {
  acceptingApplications?: boolean;
  lastUpdatedBy?: string;
}