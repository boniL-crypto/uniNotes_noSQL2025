const userService = require('../../services/userService');

jest.mock('../../models/User', () => ({
  find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([{ _id: '1', role: 'student' }]) })),
  findById: jest.fn((id) => ({
    lean: jest.fn().mockResolvedValue(
      id === 'student' ? { _id: 'student', role: 'student' } : { _id: 'admin', role: 'admin' }
    ),
  })),
  findOne: jest.fn(() => null),
}));

jest.mock('../../models/Notes', () => ({
  updateMany: jest.fn(() => Promise.resolve()),
}));


const User = require('../../models/User');

describe('userService moderator restrictions', () => {
  const moderator = { id: 'm1', role: 'moderator' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('listUsersForAdmin filters to students for moderator', async () => {
    const findMock = jest.fn(() => ({ lean: jest.fn().mockResolvedValue([{ _id: '1', role: 'student' }]) }));
    User.find.mockImplementation(findMock);

    const users = await userService.listUsersForAdmin(moderator);
    expect(findMock).toHaveBeenCalledWith({ role: 'student' });
    expect(Array.isArray(users)).toBe(true);
  });

  test('getUserVisibleById returns null for non-student when moderator', async () => {
    // id "admin" maps to role admin via our mock
    const user = await userService.getUserVisibleById('admin', moderator);
    expect(user).toBeNull();
  });

  test('getUserVisibleById returns student for moderator', async () => {
    const user = await userService.getUserVisibleById('student', moderator);
    expect(user).toBeTruthy();
    expect(user.role).toBe('student');
  });

  test('setActiveStatus is forbidden for moderator on student', async () => {
    // Adjust User.findById mock to return a real object for setActiveStatus
    const target = { _id: 'student', role: 'student', save: jest.fn(async () => {}) };
    User.findById.mockResolvedValueOnce(target);
    const result = await userService.setActiveStatus('student', true, moderator);
    expect(result.forbidden).toBe(true);
  });

  test('deleteUserByAdmin is forbidden for moderator on student', async () => {
    const target = { _id: 'student', role: 'student' };
    User.findById.mockResolvedValueOnce(target);
    const result = await userService.deleteUserByAdmin('student', moderator);
    expect(result.forbidden).toBe(true);
  });

  test('createUserByAdmin is forbidden for moderator', async () => {
    const result = await userService.createUserByAdmin({
      name: 'S', email: 's@example.com', password: 'x', role: 'student', studentId: '1234-5678'
    }, moderator);
    expect(result.forbidden).toBeTruthy();
  });
});
