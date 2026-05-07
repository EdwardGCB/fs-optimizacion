import ApiService from "@/apis/ApiService.js"

const primaryPath = "/grafic"
class GraficService {
  create(data: any): Promise<any> {
    return ApiService.post(primaryPath, data)
  }
  get(id: string): Promise<any> {
    return ApiService.get(primaryPath + `/${id}`)
  }
  update(id: string, data: any): Promise<any> {
    return ApiService.put(primaryPath + `/${id}`, data)
  }
  delete(id: string): Promise<any> {
    return ApiService.delete(primaryPath + `/${id}`)
  }
}

export default new GraficService()
