const mockUpsert = jest.fn(async () => ({ error: null }));
const mockSelect = jest.fn(() => ({
  order: jest.fn(async () => ({ data: [], error: null })),
}));
const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
  select: mockSelect,
}));

module.exports = {
  supabase: { from: mockFrom },
  _mockFrom: mockFrom,
  _mockUpsert: mockUpsert,
};
