// XState machine for simplified User account lifecycle used in this project
// Contract:
//  Inputs: events { type: 'DEACTIVATE'|'ACTIVATE'|'DELETE' }
//  Outputs: state changes and side-effect hooks (API calls to revoke tokens, anonymize data)
//  Notes: There is no email verification or suspend/ban states in this project; users are Active after register.

const { createMachine, assign } = require('xstate');

const userMachine = createMachine({
  id: 'user',
  initial: 'active',
  context: {
    userId: null,
    lastError: null
  },
  states: {
    active: {
      on: {
        DEACTIVATE: {
          target: 'deactivated',
          actions: ['revokeTokens', 'logAction']
        },
        DELETE: {
          target: 'deleted',
          actions: ['anonymizeData', 'removeAvatar', 'logAction']
        }
      }
    },
    deactivated: {
      on: {
        ACTIVATE: {
          target: 'active',
          actions: ['restoreAccess', 'logAction']
        },
        DELETE: {
          target: 'deleted',
          actions: ['anonymizeData', 'removeAvatar', 'logAction']
        }
      }
    },
    deleted: {
      type: 'final'
    }
  }
}, {
  actions: {
    revokeTokens: (ctx, evt) => {
      // Placeholder: call API to revoke sessions/tokens for ctx.userId
    },
    anonymizeData: (ctx, evt) => {
      // Placeholder: call API to anonymize personal data or schedule cleanup job
    },
    removeAvatar: (ctx, evt) => {
      // Placeholder: remove avatar file from uploads/avatars
    },
    restoreAccess: (ctx, evt) => {
      // Placeholder: re-enable account flags, notify user
    },
    logAction: (ctx, evt) => {
      // Placeholder: record admin/user action in audit log
    }
  }
});

module.exports = userMachine;
