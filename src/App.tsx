import { useEffect, useState } from 'react'
import {
  MantineProvider,
  Container,
  Title,
  Text,
  Button,
  Modal,
  NumberInput,
  Stack,
  Group,
  Card,
  Badge,
  Select,
  Pagination,
  Loader,
  Center,
  rem,
  Alert,
  Chip,
} from '@mantine/core'
import { IconDroplet, IconPlus, IconAlertCircle, IconCheck } from '@tabler/icons-react'
import '@mantine/core/styles.css'
import { supabase, type Reading, type MealType, MEAL_TYPE_LABELS } from './lib/supabase'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const FIXED_NAME = 'Hương'
const PAGE_SIZE = 5

function getStatus(valueMgdl: number, type?: string) {
  if (valueMgdl < 70) return { label: 'Thấp', color: 'blue' }

  if (type === 'khi_doi') {
    if (valueMgdl <= 95) return { label: 'Bình thường', color: 'green' }
    if (valueMgdl <= 125) return { label: 'Tiền tiểu đường', color: 'yellow' }
    return { label: 'Cao', color: 'red' }
  }

  // Sau ăn sáng/trưa/tối
  if (valueMgdl < 120) return { label: 'Bình thường', color: 'green' }
  if (valueMgdl <= 139) return { label: 'Tiền tiểu đường', color: 'yellow' }
  return { label: 'Cao', color: 'red' }
}

function toMgdl(value: number, unit: string) {
  return unit === 'mmol/L' ? Math.round(value * 18.0182) : value
}

export default function App() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [newValue, setNewValue] = useState<number | string>('')
  const [unit, setUnit] = useState<'mg/dL' | 'mmol/L'>('mg/dL')
  const [mealType, setMealType] = useState<MealType>('khi_doi')
  const [submitting, setSubmitting] = useState(false)
  const [filterDate, setFilterDate] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null)

  async function fetchReadings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('readings')
      .select('*')
      .eq('name', FIXED_NAME)
      .order('time', { ascending: false })
    if (!error && data) setReadings(data)
    setLoading(false)
  }

  useEffect(() => { fetchReadings() }, [])

  const uniqueDates = Array.from(
    new Set(readings.map((r) => dayjs(r.time).format('YYYY-MM-DD')))
  ).sort((a, b) => (a > b ? -1 : 1))

  const filtered = filterDate
    ? readings.filter((r) => dayjs(r.time).format('YYYY-MM-DD') === filterDate)
    : readings

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const latest = readings[0]

  async function handleAdd() {
    const num = Number(newValue)
    if (!num || num <= 0) return
    setSubmitting(true)
    const valueInMgdl = toMgdl(num, unit)
    const { error } = await supabase.from('readings').insert({
      name: FIXED_NAME,
      value: valueInMgdl,
      time: new Date().toISOString(),
      type: mealType,
    })
    if (error) {
      setToast({ ok: false, msg: 'Lỗi khi lưu: ' + error.message })
    } else {
      setToast({ ok: true, msg: 'Đã lưu chỉ số thành công!' })
      setModalOpen(false)
      setNewValue('')
      setMealType('khi_doi')
      await fetchReadings()
    }
    setSubmitting(false)
    setTimeout(() => setToast(null), 3000)
  }

  const num = Number(newValue)
  const preview = num > 0
    ? unit === 'mg/dL'
      ? `≈ ${(num / 18.0182).toFixed(1)} mmol/L`
      : `≈ ${Math.round(num * 18.0182)} mg/dL`
    : null

  return (
    <MantineProvider>
      <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: 48 }}>

        {/* Toast */}
        {toast && (
          <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, maxWidth: 300 }}>
            <Alert
              color={toast.ok ? 'green' : 'red'}
              icon={toast.ok ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
              withCloseButton
              onClose={() => setToast(null)}
            >
              {toast.msg}
            </Alert>
          </div>
        )}

        {/* Header */}
        <div style={{ background: 'white', borderBottom: '1px solid #e9ecef', padding: '14px 0', marginBottom: 24 }}>
          <Container size="sm">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <IconDroplet size={26} color="#e03131" />
                <div>
                  <Title order={4} style={{ lineHeight: 1 }}>Đo Đường Huyết</Title>
                  <Text size="xs" c="dimmed">{FIXED_NAME}</Text>
                </div>
              </Group>
              <Button leftSection={<IconPlus size={15} />} color="red" size="sm" onClick={() => setModalOpen(true)}>
                Thêm
              </Button>
            </Group>
          </Container>
        </div>

        <Container size="sm">

          {/* Latest */}
          {latest && (
            <Card withBorder radius="md" mb="md" p="lg">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} mb={4}>Kết quả mới nhất</Text>
              <Group align="flex-end" gap="xs">
                <Text style={{ fontSize: rem(52), fontWeight: 800, lineHeight: 1, color: '#e03131' }}>
                  {latest.value}
                </Text>
                <Stack gap={2} mb={6}>
                  <Text size="sm" c="dimmed">mg/dL</Text>
                  <Text size="sm" c="dimmed">({(latest.value / 18.0182).toFixed(1)} mmol/L)</Text>
                </Stack>
                <Badge color={getStatus(latest.value, latest.type).color} size="lg" mb={6}>
                  {getStatus(latest.value, latest.type).label}
                </Badge>
              </Group>
              <Group gap="xs" mt={2}>
                {latest.type && (
                  <Badge variant="outline" color="gray" size="sm">{MEAL_TYPE_LABELS[latest.type]}</Badge>
                )}
                <Text size="sm" c="dimmed">
                  {dayjs(latest.time).format('HH:mm — DD/MM/YYYY')} · {dayjs(latest.time).fromNow()}
                </Text>
              </Group>
            </Card>
          )}

          {/* Filter bar */}
          <Group justify="space-between" mb="xs">
            <Text fw={600} size="sm">Lịch sử ({filtered.length})</Text>
            <Select
              placeholder="Lọc theo ngày"
              clearable
              size="xs"
              value={filterDate}
              onChange={(v) => { setFilterDate(v); setPage(1) }}
              data={uniqueDates.map((d) => ({ value: d, label: dayjs(d).format('DD/MM/YYYY') }))}
              style={{ width: 150 }}
            />
          </Group>

          {/* List */}
          {loading ? (
            <Center py={40}><Loader color="red" size="sm" /></Center>
          ) : paginated.length === 0 ? (
            <Card withBorder radius="md" p="xl">
              <Center><Text c="dimmed" size="sm">Chưa có dữ liệu</Text></Center>
            </Card>
          ) : (
            <Stack gap="xs">
              {paginated.reduce<{ date: string; items: Reading[] }[]>((groups, r) => {
                const date = dayjs(r.time).format('YYYY-MM-DD')
                const last = groups[groups.length - 1]
                if (last && last.date === date) last.items.push(r)
                else groups.push({ date, items: [r] })
                return groups
              }, []).map(({ date, items }) => (
                <div key={date}>
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb={6} mt={4}>
                    {dayjs(date).isSame(dayjs(), 'day')
                      ? 'Hôm nay'
                      : dayjs(date).isSame(dayjs().subtract(1, 'day'), 'day')
                      ? 'Hôm qua'
                      : dayjs(date).format('dddd, DD/MM/YYYY')}
                  </Text>
                  <Stack gap="xs">
                    {items.map((r) => {
                      const s = getStatus(r.value, r.type)
                      return (
                        <Card key={r.id} withBorder radius="md" p="md">
                          <Group justify="space-between" wrap="nowrap">
                            <div>
                              <Group gap={6} align="baseline">
                                <Text fw={700} size="lg">{r.value}</Text>
                                <Text size="xs" c="dimmed">mg/dL</Text>
                                <Text size="xs" c="dimmed">· {(r.value / 18.0182).toFixed(1)} mmol/L</Text>
                              </Group>
                              <Group gap="xs" mt={2}>
                                {r.type && (
                                  <Badge variant="outline" color="gray" size="xs">{MEAL_TYPE_LABELS[r.type]}</Badge>
                                )}
                                <Text size="xs" c="dimmed">{dayjs(r.time).format('HH:mm')}</Text>
                              </Group>
                            </div>
                            <Badge color={s.color} variant="light">{s.label}</Badge>
                          </Group>
                        </Card>
                      )
                    })}
                  </Stack>
                </div>
              ))}
            </Stack>
          )}

          {totalPages > 1 && (
            <Center mt="md">
              <Pagination total={totalPages} value={page} onChange={setPage} color="red" size="sm" />
            </Center>
          )}
        </Container>

        {/* Modal */}
        <Modal
          opened={modalOpen}
          onClose={() => { setModalOpen(false); setNewValue('') }}
          title="Thêm chỉ số tiểu đường"
          centered
          size="sm"
        >
          <Stack>
            <Select
              label="Đơn vị"
              value={unit}
              onChange={(v) => setUnit(v as 'mg/dL' | 'mmol/L')}
              data={[{ value: 'mg/dL', label: 'mg/dL' }, { value: 'mmol/L', label: 'mmol/L' }]}
            />
            <NumberInput
              label={`Chỉ số (${unit})`}
              placeholder={unit === 'mg/dL' ? 'Ví dụ: 95' : 'Ví dụ: 5.3'}
              value={newValue}
              onChange={setNewValue}
              min={0}
              decimalScale={unit === 'mmol/L' ? 1 : 0}
              autoFocus
            />
            {preview && <Text size="xs" c="dimmed">{preview}</Text>}
            <div>
              <Text size="sm" fw={500} mb={6}>Thời điểm đo</Text>
              <Chip.Group value={mealType} onChange={(v) => setMealType(v as MealType)}>
                <Group gap="xs">
                  {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                    <Chip key={value} value={value} color="red" size="sm">{label}</Chip>
                  ))}
                </Group>
              </Chip.Group>
            </div>
            <Button
              color="red"
              loading={submitting}
              onClick={handleAdd}
              disabled={!num || num <= 0}
            >
              Lưu
            </Button>
          </Stack>
        </Modal>
      </div>
    </MantineProvider>
  )
}
