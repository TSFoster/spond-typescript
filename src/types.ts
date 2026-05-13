// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthToken {
  token: string;
  expiration: string;
}

export interface LoginResponse {
  accessToken: AuthToken;
  refreshToken?: AuthToken;
  passwordToken: AuthToken;
}

export interface CreateAccountRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  locale: string;
  intMarketing: boolean;
  extMarketing: boolean;
  dateOfBirth: string;
  gender: string;
}

export interface CreateAccountResponse {
  method: string;
  primaryEmail: string;
}

export interface VerifyAccountRequest {
  email: string;
  verificationCode: string;
}

// ---------------------------------------------------------------------------
// Users & Profile
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  unableToReach: boolean;
  imageUrl: string;
  phoneNumber?: string;
  email?: string;
  dateOfBirth?: string;
}

export interface GlobalPushPreferences {
  acceptPushDisabled: boolean;
  declinePushDisabled: boolean;
  acceptTaskPushDisabled: boolean;
  declineTaskPushDisabled: boolean;
  commentNotifications: string;
  invitationPushDisabled: boolean;
  postPushDisabled: boolean;
  reminderPushDisabled: boolean;
  scheduledPrealertPushDisabled: boolean;
  scheduledSentPushDisabled: boolean;
  bonusContributePushDisabled: boolean;
  bonusAchievementPushDisabled: boolean;
  matchNotificationsPushDisabled: boolean;
  availablePushDisabled: boolean;
  unavailablePushDisabled: boolean;
  availabilityReminderPushDisabled: boolean;
}

export interface ProfilePreferences {
  globalPushPreferences: GlobalPushPreferences;
  groupPushPreferences: Record<string, unknown>;
  targetedAdsDisabled: boolean;
  cashbackPromoDisabled: boolean;
  partnerPromoDisabled: boolean;
  optionalSettings: Record<string, unknown>;
}

export interface PersonalProfile extends User {
  primaryEmail: string;
  dummy: boolean;
  trackingId: string;
  timezone: string;
  unsubscribeCode: string;
  locale: string;
  countryCode: string;
  internal: boolean;
  deleted: boolean;
  contactMethod: string;
  alternateEmails: string[];
  preferences: ProfilePreferences;
  gender: string;
  tosVersion: number;
  formattedPhoneNumber: string;
  contact: boolean;
}

export interface UserHash {
  webUserHash: string;
  androidUserHash: string;
  iosUserHash: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

export interface SubGroup {
  id: string;
  name: string;
  color: string;
}

export interface GroupRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface MemberProfile extends User {
  contactMethod: string;
}

export interface GroupMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  respondent: boolean;
  profile?: MemberProfile;
  guardians: GroupMember[];
  creator?: boolean;
  address?: string[];
}

export interface Group {
  id: string;
  contactPersonId: string;
  name: string;
  imageUrl: string;
  subGroups: SubGroup[];
  createdTime: string;
  members: GroupMember[];
  membershipRequests?: GroupMember;
}

export interface GroupDetailed {
  id: string;
  contactPerson: User;
  name: string;
  welcomeMessage: string;
  activity: string;
  createdTime: string;
  members: GroupMember[];
  subGroups: string[];
  experiments: Record<string, unknown>;
  shareContactInfo: boolean;
  adminsCanAddMembers: boolean;
  contactInfoHidden: boolean;
  memberPermissions: string[];
  guardianPermissions: string[];
  eventVisibility: string;
  chatAgeLimit: number;
  type: number;
  invitedToAppTime: string;
  signUpUrl: string;
  countryCode: string;
  allowSmsNag: boolean;
  bonusEnabled: boolean;
  fieldDefs: Record<string, unknown>;
  defaultFields: Record<string, unknown>;
  roles: GroupRole[];
  addressFormat: string[];
  allowPrivatePayoutAccounts: boolean;
}

export interface FavoriteGroup {
  groupId: string;
  subGroupId: string;
  timestamp: string;
}

export interface CreateGroupRequest {
  name: string;
  type: number;
  activity: string;
  contactInfoHidden: boolean;
  primaryContact: string;
  chatAgeLimit: number;
  subGroups: unknown[];
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface Location {
  id?: string;
  latitude: number;
  longitude: number;
  addressLine?: number;
  featureName?: string;
  country?: string;
  administrativeAreaLevel1?: string;
  administrativeAreaLevel2?: string;
  locality?: string;
  feature?: string;
  address?: string;
}

export interface Task {
  id: string;
  name: string;
  description: string;
  type: string;
  adultsOnly: boolean;
  limit: number;
}

export interface Attachment {
  id: string;
  media: string;
  type: number;
  title: string;
  ownerId: string;
  timestamp: string;
}

export interface Comment {
  id: string;
  fromProfileId: string;
  text: string;
  timestamp: string;
  reactions: Record<string, Record<string, number>>;
}

export interface EventOwner extends User {
  response: string;
  appUser?: boolean;
}

export interface EventResponses {
  acceptedIds: string[];
  declinedIds: string[];
  unansweredIds: string[];
  waitinglistIds: string[];
  declineMessages: unknown;
}

export interface Event {
  id: string;
  creatorId: string;
  owners: EventOwner[];
  heading: string;
  description: string;
  startTimestamp: string;
  endTimestamp: string;
  recipients: {
    group: Group;
  };
  responses: EventResponses;
  tasks: Task[];
  comments: Comment[];
  attachments: Attachment[];
  createdTime: string;
  expired: boolean;
  visibility: string;
  behalfOfIds: string[];
  autoAccept: boolean;
  hidden: boolean;
  autoReminderType: string;
  participantsHidden: boolean;
  registered: boolean;
  commentsDisabled: boolean;
  type: string;
  updated: number;
  matchEvent: boolean;
}

export interface CreateEventRequest {
  heading: string;
  description: string;
  spondType: string;
  startTimestamp: string;
  openEnded: boolean;
  commentsDisabled: boolean;
  meetupPrior?: string;
  maxAccepted: number;
  rsvpDate?: string;
  location: Location;
  owners: Array<{ id: string }>;
  visibility: string;
  participantsHidden: boolean;
  autoReminderType: string;
  matchInfo?: unknown;
  autoAccept: boolean;
  fileInput?: string;
  attachments: Attachment[];
  type: string;
  tasks: {
    openTasks: Task[];
    assignedTasks: unknown[];
  };
  recipients: {
    groupMembers: string[];
    group: { id: string };
  };
}

export interface ChangeResponseOptions {
  skipPayment?: boolean;
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export interface PostMedia {
  url: string;
  width?: number;
  height?: number;
  type: string;
}

export interface Post {
  id: string;
  type: string;
  groupId: string;
  subGroupIds: string[];
  title: string;
  body: string;
  ownerId: string;
  timestamp: string;
  media: PostMedia[];
  reactions: Record<string, Record<string, number>>;
  attachments: Attachment[];
  visibility: string;
  unread: boolean;
  commentsDisabled: boolean;
  seenCount: number;
  muted: boolean;
  selectMemberPoll: boolean;
  comments: Comment[];
}

// ---------------------------------------------------------------------------
// Chat / Messages
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  [key: string]: unknown;
}

export interface SendMessageOptions {
  text: string;
  /** Continue an existing chat thread. */
  chatId?: string;
  /** Start a new chat with this user (requires `groupId`). */
  userId?: string;
  /** Group context for starting a new chat (requires `userId`). */
  groupId?: string;
}

// ---------------------------------------------------------------------------
// Club / Transactions
// ---------------------------------------------------------------------------

export interface Transaction {
  id: string;
  [key: string]: unknown;
}

export interface GetTransactionsOptions {
  /** Number of items to skip (for manual pagination). */
  skip?: number;
  /** Maximum number of transactions to fetch. Defaults to 100. */
  maxItems?: number;
}

// ---------------------------------------------------------------------------
// Query option types
// ---------------------------------------------------------------------------

export interface GetEventsOptions {
  groupId?: string;
  subGroupId?: string;
  includeScheduled?: boolean;
  includeHidden?: boolean;
  maxEnd?: Date;
  minEnd?: Date;
  maxStart?: Date;
  minStart?: Date;
  maxEvents?: number;
}

export interface GetPostsOptions {
  type?: string;
  includeComments?: boolean;
  includeReadStatus?: boolean;
  includeSeenCount?: boolean;
  max?: number;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export interface ClockResponse {
  time: string;
}

export interface SpondConfig {
  username: string;
  password: string;
  apiUrl?: string;
}
