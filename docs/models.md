User
(Attributes)
- _id:ObjectId
- name:String
- email:String (lowercase, trim, unique)
- passwordHash:String (required unless googleId)
- googleId:String (index)
- role:String enum['student','admin','moderator','super_admin'] (default:'student')
- college:String
- course:String
- yearLevel:String
- studentId:String (unique, sparse)
- contact:String
- bio:String
- avatar:String
- isActive:Boolean (default:true)
- createdAt:Date (default:now)
- resetPasswordToken:String
- resetPasswordExpires:Date
- emailVerified:Boolean (default:false)
- verifyEmailToken:String
- verifyEmailExpires:Date
- pendingDeletion:{ status:String enum['pending','approved','rejected'], requestedAt:Date }
- dismissedNotifications:[ObjectId ref 'Notification'] (index)

(Functions)
+ validateRegistrationInputs(payload)
+ registerStudent(payload, fileInfo)
+ requestAccountDeletion(userId, password)
+ verifyLoginCredentials(email, password)
+ getProfile(userId)
+ prevalidateUpdateProfile(userId, data)
+ updateProfile(userId, data, fileInfo)
+ forgotPassword(email)
+ resetPassword(token, newPassword)
+ verifyEmail(token)
+ resendVerification(email)
+ getMetadata()  // userService
+ listUsersForAdmin(currentUser)
+ getUserVisibleById(id, currentUser)
+ setActiveStatus(id, isActive, currentUser)
+ deleteUserByAdmin(id, currentUser)
+ createUserByAdmin(payload, currentUser)


Note
(Attributes)
- _id:ObjectId
- title:String (required)
- subject:ObjectId ref 'Subject' (required)
- description:String
- tags:[String]
- filePath:String
- fileOriginalName:String
- uploader:ObjectId ref 'User'
- uploaderName:String
- uploadDate:Date (default:now)
- visibility:String enum['public','private'] (default:'public')
- likesCount:Number (default:0)
- likes:[ObjectId ref 'User']
- downloads:Number (default:0)
- reportsCount:Number (default:0)
- isOrphaned:Boolean (default:false)

(Functions)
+ getMineNotes(userId, queryParams)
+ getPublicNotes(opts)
+ getStats(userId)
+ recordDownload(noteId)
+ toggleLike(noteId, user)
+ reportNote(noteId, userId, reason, description)
+ getNoteById(id, currentUserId)
+ validateCreateInputs({ title, subject, tags, description, visibility }, userId)
+ validateUpdateInputs(noteId, userId, cleaned)
+ createNote({ title, subject, tags, description, visibility }, file, user)
+ updateNote(noteId, userId, cleaned, file)
+ deleteNoteAndResolveReports(noteId, userId)
+ assignCollection(noteId, userId, collectionId)
+ getAdminNotes(queryParams, page, limit)
+ getAdminNoteById(id)
+ adminUpdateNote(noteId, cleaned, file)
+ adminDeleteNote(noteId, actorId)
+ getKpisSummary()


Collection
(Attributes)
- _id:ObjectId
- title:String (required)
- description:String
- owner:ObjectId ref 'User' (required)
- createdAt:Date (default:now)
- notes:[ObjectId ref 'Note']

(Functions)
+ listForUser(userId)
+ create(userId, { title, description })
+ update(userId, id, { title, description })
+ remove(userId, id)
+ getNotes(userId, id)


College
(Attributes)
- _id:ObjectId
- name:String (required, trim, unique)
- abbreviation:String (trim, unique, default:'')
- courses:[{ code:String (required, trim), name:String (required, trim) }]
- createdAt:Date (default:now)

(Functions)
+ list()
+ getById(id)
+ create({ name, abbreviation, courses })
+ update(id, { name, abbreviation, courses })
+ remove(id)
+ pre('save')  // de-duplicate courses on save
+ pre('findOneAndUpdate')  // de-duplicate courses on update


Subject
(Attributes)
- _id:ObjectId
- subjectCode:String (required, trim, unique)
- subjectName:String (required, trim)
- description:String (trim; setter stores undefined if empty)
- createdAt:Date (auto)
- updatedAt:Date (auto)

(Functions)
+ list()
+ listByName()
+ getById(id)
+ create({ subjectCode, subjectName, description })
+ update(id, { subjectCode, subjectName, description })
+ remove(id)


Notification
(Attributes)
- _id:ObjectId
- recipients:[ObjectId ref 'User'] (index)
- actorId:ObjectId ref 'User'
- origin:String enum['system','admin','manual','student'] (default:'system')
- type:String enum['like','admin','report-status','manual','activity-log','system','report_resolved','note_deleted_reported'] (required)
- message:String (required)
- createdAt:Date (default:now)
- expiresAt:Date (default:now + 30 days)

(Functions)
+ createReportStatusNotification({ recipients, message, noteId })
+ findUsersForSelection(q)
+ getCourses()
+ getIncoming(adminId, page, limit)
+ getOutgoing(adminId, page, limit)
+ sendManualNotification({ recipientType, userIds, course, message, actorId })
+ deleteById(id)
+ bulkDelete(ids)
+ listForUser(userId, page, limit)
+ markRead()
+ markAllRead()
+ unreadCount(userId)
+ hideForUser(userId, id)
+ bulkHideForUser(userId, ids)
+ unhideForUser(userId, id)
+ bulkUnhideForUser(userId, ids)
+ deleteForUser(userId, id)
+ undoDeleteForUser(userId, id)
+ withdrawNotification(_adminId, id)
+ purgeOldStates()


Report
(Attributes)
- _id:ObjectId
- noteId:ObjectId ref 'Note' (required)
- reportedBy:ObjectId ref 'User' (required)
- reason:String (required)
- description:String
- status:String enum['pending','reviewed','resolved','rejected'] (default:'pending')
- createdAt:Date (default:now)
- reviewedBy:ObjectId ref 'User'
- reviewedAt:Date
- resolvedBy:ObjectId ref 'User'
- resolvedAt:Date
- rejectedBy:ObjectId ref 'User'
- rejectedAt:Date

(Functions)
+ getAllReports()
+ getReportById(id)
+ changeStatus(reportId, status, actorId, opts)
+ deleteReport(reportId)
+ pre('save')  // auto-set reviewedAt/resolvedAt/rejectedAt on status change