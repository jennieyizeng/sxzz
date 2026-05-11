import test from 'node:test'
import assert from 'node:assert/strict'
import { SYSTEM_DEPT_CONFIGS, SYSTEM_INSTITUTION_CONFIGS, SYSTEM_SSO_USERS } from '../data/systemAdminConfig.js'
import { INSTITUTIONS } from '../data/mockData.js'
import {
  getInstitutionLevel,
  getReceivingAbilityLabel,
  getReceivingAbilityTip,
  getReceivingServiceStatusDescription,
  getReceivingServiceStatusDetail,
  getReceivingServiceStatus,
  isReceivingServiceAvailable,
  RECEIVING_INCOMPLETE_HINT,
} from './institutionReferralParams.js'

const options = { users: SYSTEM_SSO_USERS, deptConfigs: SYSTEM_DEPT_CONFIGS }
const findInstitution = id => SYSTEM_INSTITUTION_CONFIGS.find(item => item.id === id)

test('maps institution categories to receiving ability labels and levels', () => {
  assert.equal(getReceivingAbilityLabel({ type: '综合医院' }), '接收上转能力')
  assert.equal(getReceivingAbilityLabel({ type: '乡镇卫生院' }), '接收转入能力')
  assert.equal(getReceivingAbilityTip({ type: '乡镇卫生院' }), '允许该机构接收上级医院发起的转出申请。')
  assert.equal(getInstitutionLevel({ type: '综合医院' }), '县级')
  assert.equal(getInstitutionLevel({ type: '社区卫生服务中心' }), '基层')
})

test('receiving service status combines ability switch and required configuration', () => {
  assert.equal(getReceivingServiceStatus(findInstitution('I001'), options), '可用')
  assert.equal(getReceivingServiceStatus(findInstitution('I002'), options), '可用')
  assert.equal(getReceivingServiceStatus(findInstitution('I003'), options), '未启用')
  assert.equal(getReceivingServiceStatus(findInstitution('I004'), options), '配置不完整')
  assert.equal(getReceivingServiceStatus(findInstitution('I005'), options), '未启用')
})

test('only available receiving institutions can be selected as referral targets', () => {
  assert.equal(isReceivingServiceAvailable(findInstitution('I001'), options), true)
  assert.equal(isReceivingServiceAvailable(findInstitution('I004'), options), false)
})

test('referral form mock target selection keeps complete institutions selectable', () => {
  const mockCounty = INSTITUTIONS.find(item => item.id === 'inst001')
  const mockPrimary = INSTITUTIONS.find(item => item.id === 'inst002')

  assert.equal(getReceivingServiceStatus(mockCounty, { users: SYSTEM_SSO_USERS }), '可用')
  assert.equal(getReceivingServiceStatus(mockPrimary, { users: SYSTEM_SSO_USERS }), '可用')
})

test('receiving service status exposes user-facing descriptions', () => {
  assert.equal(getReceivingServiceStatusDescription('未启用'), '该机构当前未开启接收转诊能力，发起端不可选择。')
  assert.equal(getReceivingServiceStatusDescription('配置不完整'), '该机构已开启接收转诊能力，但缺少必要用户、权限、科室或联系电话，发起端暂不可选择。')
  assert.equal(getReceivingServiceStatusDescription('可用'), '该机构已完成接收转诊配置，发起端可选择。')
  assert.equal(RECEIVING_INCOMPLETE_HINT, '该机构接收配置不完整，暂不可选择，请联系管理员完善配置。')
})

test('institution parameter mocks cover disabled incomplete and available receiving states', () => {
  const disabled = SYSTEM_INSTITUTION_CONFIGS.find(item => item.name === 'xx市第五人民医院')
  const incomplete = SYSTEM_INSTITUTION_CONFIGS.find(item => item.name === 'xx市中医医院')
  const available = SYSTEM_INSTITUTION_CONFIGS.find(item => item.name === 'xx市人民医院')

  assert.equal(getReceivingServiceStatusDetail(disabled, options).status, '未启用')

  const incompleteDetail = getReceivingServiceStatusDetail(incomplete, options)
  assert.equal(incompleteDetail.status, '配置不完整')
  assert.deepEqual(incompleteDetail.missingItems, [
    '未检测到具备上转受理权限的用户',
    '未配置急诊科联系电话',
  ])

  assert.equal(getReceivingServiceStatusDetail(available, options).status, '可用')
})
