import axios from "axios"
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosRequestConfig,
} from "axios"

// Helper function to get cookie value
const extractToken = () =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("pse_token="))
    ?.split("=")[1]

class ApiService {
  private api: AxiosInstance

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: true,
    })

    // Interceptor para agregar token a las peticiones
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Obtener token de localStorage (prioridad) o cookies
        const token = extractToken()

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // También enviar cookies por si acaso
        config.withCredentials = true

        return config
      },
      (error: AxiosError) => {
        return Promise.reject(error)
      }
    )
  }

  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.api.get<T>(url, config).then((response) => response.data)
  }

  post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.api.post<T>(url, data, config).then((response) => response.data)
  }

  put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    return this.api.put<T>(url, data, config).then((response) => response.data)
  }

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.api.delete<T>(url, config).then((response) => response.data)
  }

  // Método adicional para obtener la instancia completa de axios si se necesita
  getInstance(): AxiosInstance {
    return this.api
  }
}

export default new ApiService(import.meta.env.VITE_API_URL)
