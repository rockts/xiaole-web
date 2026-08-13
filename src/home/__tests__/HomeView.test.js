import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import HomeView from '../../views/HomeView.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../services/api', () => ({ default: { getHome: vi.fn() } }))
import api from '../../services/api'

const model = { cache:{status:'fresh'}, today:{status:'available',date:'2026-08-13',summary:'今天摘要',sources:{healthy:5,unhealthy:2},new_discovered:1,relevant:2,notified:0}, recommendations:{status:'available',empty_message:'目前没有需要优先处理的事项。',items:[{stars:5,title:'未来智造家',source:'中国科协',published_at:'2026-08-01',deadline:'2026-10-20',reason:'适合科技教育',eligibility:{self:'unknown',students:'eligible',school:'possible'},action:{label:'推荐学生'},open_url:null}]}, no_notification_summary:{status:'available',period_days:7,summary:'没有达到主动通知门槛',true_new:1,categories:[{code:'low_relevance',label:'低相关未通知',count:1}]}, systems:{brain:{status:'healthy',label:'小乐 Brain',message:'正常'},memory:{status:'degraded',label:'乐知 Memory',message:'部分异常'},action:{status:'unavailable',label:'小可 Action',message:'不可用'}}, profile_status:{status:'available',needs_confirmation_count:1,message:'还有 1 项资料需要确认',fields:[]}, recent_conversations:[{session_id:'s1',title:'最近对话'}], quick_questions:['最近有什么值得我关注？'], degradations:[] }

describe('HomeView',()=>{
  it('renders five regions, profile and recommendation',async()=>{ api.getHome.mockResolvedValue(model); const w=mount(HomeView); await flushPromises(); expect(w.text()).toContain('今天摘要'); expect(w.text()).toContain('未来智造家'); expect(w.text()).toContain('低相关未通知'); expect(w.text()).toContain('小乐 Brain'); expect(w.text()).toContain('问小乐'); expect(w.text()).toContain('还有 1 项资料需要确认') })
  it('shows empty recommendation',async()=>{ api.getHome.mockResolvedValue({...model,recommendations:{...model.recommendations,items:[]}}); const w=mount(HomeView); await flushPromises(); expect(w.text()).toContain('目前没有需要优先处理的事项') })
  it('shows page retry after aggregator failure',async()=>{ api.getHome.mockRejectedValue(new Error('x')); const w=mount(HomeView); await flushPromises(); expect(w.text()).toContain('重新加载') })
  it('quick question navigates with draft and does not touch chat settings',async()=>{ localStorage.setItem('xiaole_settings','{"chatMode":"core2"}'); api.getHome.mockResolvedValue(model); const w=mount(HomeView); await flushPromises(); await w.get('[data-test="quick-question"]').trigger('click'); expect(push).toHaveBeenCalledWith({path:'/chat',state:{xiaoleDraft:'最近有什么值得我关注？',source:'home_quick_question'}}); expect(localStorage.getItem('xiaole_settings')).toBe('{"chatMode":"core2"}') })
})
