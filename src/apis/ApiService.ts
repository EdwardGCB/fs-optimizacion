import axios from "axios"
import type {
  AxiosInstance,
  AxiosRequestConfig,
} from "axios"

class ApiService {
  private api: AxiosInstance

  constructor(baseURL: string) {
    this.api = axios.create({
      baseURL,
      withCredentials: true,
    })
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

  getInstance(): AxiosInstance {
    return this.api
  }
}

export default new ApiService(import.meta.env.VITE_API_URL)
