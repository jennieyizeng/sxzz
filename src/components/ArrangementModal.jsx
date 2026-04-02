import { useState } from 'react'

// M-7：提取为共享组件，供 admin/Dashboard.jsx 和 ReferralDetail.jsx 复用
// J-4：新增 admissionType / deptBedInfo / bedOccupied 支持床位池展示与锁定
export default function ArrangementModal({ referral, onClose, onSubmit, admissionType, deptBedInfo, bedOccupied = 0 }) {
  const isInpatient = admissionType === 'inpatient'

  // 床位余量
  const dailyReservedBeds = deptBedInfo?.dailyReservedBeds ?? 0
  const bedRemaining = Math.max(0, dailyReservedBeds - bedOccupied)
  const bedFull = dailyReservedBeds > 0 && bedRemaining <= 0

  const [form, setForm] = useState({
    visitTime: '',
    department: referral?.toDept || '',
    room: '',
    floor: '',
    departmentPhone: '',
    doctorName: '',
    // J-4 床位字段（住院时使用）
    ward: deptBedInfo?.ward || '',
    bedAssignMode: 'specify',   // 'specify' | 'on_arrival'
    bedNumber: '',
    nurseStationPhone: deptBedInfo?.nurseStationPhone || '',
  })
  const [errors, setErrors] = useState({})

  function update(field, val) {
    setForm(p => ({ ...p, [field]: val }))
    setErrors(p => ({ ...p, [field]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.visitTime)               errs.visitTime = '请选择就诊时间'
    if (!form.department.trim())       errs.department = '请填写接诊科室'
    if (!form.room.trim() && !isInpatient) errs.room = '请填写诊室/床位'
    if (!form.floor.trim())            errs.floor = '请填写楼层区域'
    if (!form.departmentPhone.trim())  errs.departmentPhone = '请填写科室电话'
    if (isInpatient) {
      if (!form.ward.trim())             errs.ward = '请填写病区名称'
      if (form.bedAssignMode === 'specify' && !form.bedNumber.trim()) errs.bedNumber = '请填写床位号'
      if (!form.nurseStationPhone.trim()) errs.nurseStationPhone = '请填写护士站电话'
    }
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const result = { ...form }
    if (isInpatient && form.bedAssignMode === 'on_arrival') {
      result.bedNumber = '入院时由护士站安排'
    }
    onSubmit(result)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-[540px] max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-semibold text-gray-800">填写到院接诊安排</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              患者：{referral?.patient?.name} · {referral?.diagnosis?.name} · {referral?.toDept}
              {isInpatient && <span className="ml-1 text-blue-500">· 住院收治</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-700">
            📋 填写并提交后，系统将自动生成预约取号码并发送至基层医生，请告知患者凭取号码到院取号就诊（到院仍需正常缴费）
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              就诊时间 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.visitTime}
              onChange={e => update('visitTime', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${errors.visitTime ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.visitTime && <p className="text-xs text-red-500 mt-1">{errors.visitTime}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              接诊科室 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.department}
              onChange={e => update('department', e.target.value)}
              placeholder="例：心血管科"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${errors.department ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.department && <p className="text-xs text-red-500 mt-1">{errors.department}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                楼层/区域 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.floor}
                onChange={e => update('floor', e.target.value)}
                placeholder="例：3楼A区"
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${errors.floor ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.floor && <p className="text-xs text-red-500 mt-1">{errors.floor}</p>}
            </div>
            {!isInpatient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  诊室/床位 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.room}
                  onChange={e => update('room', e.target.value)}
                  placeholder="例：2号诊室"
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${errors.room ? 'border-red-400' : 'border-gray-300'}`}
                />
                {errors.room && <p className="text-xs text-red-500 mt-1">{errors.room}</p>}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              科室直线电话 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.departmentPhone}
              onChange={e => update('departmentPhone', e.target.value)}
              placeholder="例：0838-6213300"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] ${errors.departmentPhone ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.departmentPhone && <p className="text-xs text-red-500 mt-1">{errors.departmentPhone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              接诊医生
              <span className="text-gray-400 font-normal text-xs ml-1">（可选，仅供参考，患者到院后由科室安排）</span>
            </label>
            <input
              type="text"
              value={form.doctorName}
              onChange={e => update('doctorName', e.target.value)}
              placeholder="填写或留空"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF]"
            />
          </div>

          {/* J-4：住院收治时显示床位安排区块 */}
          {isInpatient && (
            <div className="rounded-lg border p-4" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
              {/* 区块标题 + 余量 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-blue-800">🛏 床位安排</span>
                {dailyReservedBeds > 0 && (
                  <span className={`text-xs font-medium ${bedFull ? 'text-orange-500' : 'text-green-600'}`}>
                    今日剩余 {bedRemaining} / {dailyReservedBeds} 床
                  </span>
                )}
              </div>

              {/* 满额警告 */}
              {bedFull && (
                <div className="mb-3 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: '#FFF7ED', color: '#C2410C' }}>
                  ⚠️ 今日转诊床位已满，仍可提交，转诊中心将人工协调
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    病区 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.ward}
                    onChange={e => update('ward', e.target.value)}
                    placeholder="例：心内科病区（6楼东）"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] bg-white ${errors.ward ? 'border-red-400' : 'border-blue-200'}`}
                  />
                  {errors.ward && <p className="text-xs text-red-500 mt-1">{errors.ward}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    床位号 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4 mb-2 text-sm">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="specify"
                        checked={form.bedAssignMode === 'specify'}
                        onChange={() => update('bedAssignMode', 'specify')}
                        className="accent-[#0BBECF]"
                      />
                      指定床位号
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        value="on_arrival"
                        checked={form.bedAssignMode === 'on_arrival'}
                        onChange={() => update('bedAssignMode', 'on_arrival')}
                        className="accent-[#0BBECF]"
                      />
                      入院时分配
                    </label>
                  </div>
                  {form.bedAssignMode === 'specify' ? (
                    <input
                      type="text"
                      value={form.bedNumber}
                      onChange={e => update('bedNumber', e.target.value)}
                      placeholder="例：312床"
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] bg-white ${errors.bedNumber ? 'border-red-400' : 'border-blue-200'}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value="入院时由护士站安排"
                      disabled
                      className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
                    />
                  )}
                  {errors.bedNumber && <p className="text-xs text-red-500 mt-1">{errors.bedNumber}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-900 mb-1">
                    护士站电话 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nurseStationPhone}
                    onChange={e => update('nurseStationPhone', e.target.value)}
                    placeholder="例：0836-12345601"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0BBECF] bg-white ${errors.nurseStationPhone ? 'border-red-400' : 'border-blue-200'}`}
                  />
                  {errors.nurseStationPhone && <p className="text-xs text-red-500 mt-1">{errors.nurseStationPhone}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
            ℹ️ 提交后系统自动生成6位预约取号码，有效期48小时。患者凭取号码到达挂号窗口优先取号，不免除挂号费用。
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg"
            style={{ background: '#0BBECF' }}
          >
            确认提交并生成取号码
          </button>
        </div>
      </div>
    </div>
  )
}
