// jest.fn-based double for "expo-asset". Asset.fromModule(moduleId) returns an asset whose
// downloadAsync resolves at once and whose localUri is a mock file URI built from the module id.
// Every member is a jest.fn so a test can make one module fail (for example a rejecting
// downloadAsync for a given id) through Asset.fromModule.mockImplementationOnce.

export interface MockAsset {
  uri: string
  localUri: string | null
  downloadAsync: jest.Mock
}

export const Asset = {
  fromModule: jest.fn(
    (moduleId: number | string): MockAsset => ({
      uri: `file:///mock/assets/${moduleId}`,
      localUri: `file:///mock/assets/${moduleId}`,
      downloadAsync: jest.fn(() => Promise.resolve()),
    }),
  ),
}
