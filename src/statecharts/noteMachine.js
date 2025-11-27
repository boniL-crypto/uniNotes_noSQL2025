// XState machine for Note lifecycle including report interaction
// Contract:
// Inputs: events { UPLOAD_SUCCESS, VALIDATION_ERROR, SET_VISIBILITY, REPORT_SUBMITTED, ADMIN_RESOLVE, UPLOADER_DELETE }
// Outputs: actions that call Note APIs (create, update, delete), and create Notifications when appropriate

const { createMachine, assign } = require('xstate');

const noteMachine = createMachine({
  id: 'note',
  initial: 'uploading',
  context: { noteId: null, error: null },
  states: {
    uploading: {
      on: {
        VALIDATED: 'stored',
        VALIDATION_ERROR: { target: 'error', actions: ['captureError'] }
      }
    },
    stored: {
      on: {
        SET_PUBLIC: 'published',
        SET_PRIVATE: 'private',
        UPLOADER_DELETE: 'deleted',
        REPORT_SUBMITTED: 'reported'
      }
    },
    published: {
      on: {
        REPORT_SUBMITTED: 'reported',
        UPLOADER_DELETE: 'deleted'
      }
    },
    private: {
      on: {
        REPORT_SUBMITTED: 'reported',
        UPLOADER_DELETE: 'deleted'
      }
    },
    reported: {
      on: {
        ADMIN_OPEN: 'review',
        UPLOADER_DELETE: 'deleted'
      }
    },
    review: {
      on: {
        ADMIN_RESOLVE: 'resolved',
        ADMIN_DELETE_NOTE: 'deleted'
      }
    },
    resolved: {
      on: { UPLOADER_DELETE: 'deleted' }
    },
    deleted: { type: 'final' },
    error: { type: 'final' }
  }
}, {
  actions: {
    captureError: assign({ error: (ctx, e) => e })
  }
});

module.exports = noteMachine;
