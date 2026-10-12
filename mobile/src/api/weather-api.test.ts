const mockApiRequest = jest.fn()

jest.mock("./client", () => ({
  ...jest.requireActual("./client"),
  apiRequest: mockApiRequest,
}))

import { ApiError } from "./client"
import { fetchWeather } from "./weather-api"

const API = "https://api.example.com"

describe("fetchWeather", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiRequest.mockResolvedValue({ observation: null, reason: "no_data" })
  })

  it("asks GET /weather with the position, the time and the Bearer token", async () => {
    await fetchWeather(API, "access-token", {
      lat: 48.4,
      lng: 2.7,
      at: "2026-10-11T08:12:41.000Z",
    })

    expect(mockApiRequest).toHaveBeenCalledTimes(1)
    expect(mockApiRequest).toHaveBeenCalledWith({
      baseUrl: API,
      path: "/weather?lat=48.4&lng=2.7&at=2026-10-11T08%3A12%3A41.000Z",
      method: "GET",
      token: "access-token",
    })
  })

  it("rounds the coordinates to four decimals", async () => {
    await fetchWeather(API, "t", { lat: 48.400049, lng: -2.73456789, at: "2026-10-11T08:00:00Z" })
    const [options] = mockApiRequest.mock.calls[0]
    expect(options.path).toContain("lat=48.4&")
    expect(options.path).toContain("lng=-2.7346&")
  })

  it("returns the typed body, an empty answer included", async () => {
    await expect(fetchWeather(API, "t", { lat: 1, lng: 2, at: "x" })).resolves.toEqual({
      observation: null,
      reason: "no_data",
    })
    const observation = {
      sky: "cloudy",
      temperature_c: 12,
      wind_kmh: 8,
      rain_24h_mm: 0,
      observed_at: "2026-10-11T08:00:00.000Z",
      source: "meteo_france",
      station: { id: "77186001", name: "Melun", distance_km: 3.1 },
    }
    mockApiRequest.mockResolvedValueOnce({ observation })
    await expect(fetchWeather(API, "t", { lat: 1, lng: 2, at: "x" })).resolves.toEqual({
      observation,
    })
  })

  it("lets a provider outage reject as an ApiError 503", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new ApiError(503, "HTTP 503", { code: "weather_provider_unavailable" }),
    )
    await expect(fetchWeather(API, "t", { lat: 1, lng: 2, at: "x" })).rejects.toMatchObject({
      status: 503,
      body: { code: "weather_provider_unavailable" },
    })
  })
})
