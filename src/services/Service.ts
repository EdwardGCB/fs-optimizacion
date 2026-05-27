import ApiService from "@/apis/ApiService.js"

const primaryPath = "/optimizations"
class Service {
  create(data: any): Promise<any> {
    return ApiService.post(primaryPath + `/`, data)
  }
  get(type: string, id: string): Promise<any> {
    return ApiService.get(primaryPath + `/${type}/${id}`)
  }
  update(id: string, data: any): Promise<any> {
    return ApiService.put(primaryPath + `/${id}`, data)
  }
  delete(id: string): Promise<any> {
    return ApiService.delete(primaryPath + `/${id}`)
  }
}

export default new Service()
